import json
import time
from typing import Dict, Any, List

from app.ai import (
    build_participants_system_prompt,
    build_events_system_prompt,
    build_translation_system_prompt,
    build_clause_merge_system_prompt,
    build_passage_context,
    build_passage_context_with_units,
    build_clause_merge_user_prompt,
    call_llm_for_json,
    parse_json_response,
    LLMConfig,
)


class AIService:
    
    @staticmethod
    async def analyze_participants(passage_data: Dict) -> Dict[str, Any]:
        """
        Phase 1: Analyze Participants & Relations.
        
        Args:
            passage_data: Dictionary containing passage reference and clauses.
            
        Returns:
            Dictionary with 'participants' and 'relations' arrays.
        """
        print(f"[AI] Starting Phase 1: Participants & Relations for {passage_data.get('reference')}")
        start_time = time.time()
        
        result = await call_llm_for_json(
            system_prompt=build_participants_system_prompt(),
            user_prompt=build_passage_context(passage_data),
            model=LLMConfig.MODEL_OPUS,
        )
        
        api_time = time.time() - start_time
        print(f"[AI] Phase 1 completed in {api_time:.2f}s")
        
        return {
            "participants": result.get("participants", []),
            "relations": result.get("relations", [])
        }

    @staticmethod
    async def analyze_events(passage_data: Dict, participants_context: str) -> Dict[str, Any]:
        """
        Phase 2: Analyze Events & Discourse (requires Phase 1 context).
        
        Args:
            passage_data: Dictionary containing passage reference, clauses, and display_units.
            participants_context: JSON string of participants from Phase 1.
            
        Returns:
            Dictionary with 'events' and 'discourse' arrays.
        """
        print(f"[AI] Starting Phase 2: Events & Discourse for {passage_data.get('reference')}")
        start_time = time.time()
        
        num_units = len(passage_data.get("display_units") or [])
        num_clauses = len(passage_data.get("clauses") or [])
        
        if num_units:
            print(f"[AI] Input: {num_units} display units, {num_clauses} raw clauses")
            print(f"[AI] Phase 2 using display_units: {num_units} units (expect 1 event per unit)")
        
        use_units = bool(passage_data.get("display_units"))
        user_prompt = build_passage_context_with_units(passage_data) if use_units else build_passage_context(passage_data)
        
        result = await call_llm_for_json(
            system_prompt=build_events_system_prompt(participants_context),
            user_prompt=user_prompt,
            model=LLMConfig.MODEL_OPUS,
        )
        
        api_time = time.time() - start_time
        print(f"[AI] Phase 2 completed in {api_time:.2f}s")
        
        events = result.get("events", [])
        print(f"[AI] Phase 2 returned {len(events)} events (display_units={num_units})")
        
        if num_units and len(events) != num_units:
            print(f"[AI] WARNING: event count ({len(events)}) != display unit count ({num_units}). AI may have merged/skipped units.")
        
        return {
            "events": events,
            "discourse": result.get("discourse", [])
        }

    @staticmethod
    async def analyze_passage(passage_data: Dict, model: str = "claude") -> Dict[str, Any]:
        """
        Main entry point for AI analysis - Orchestrates 2-Phase Analysis.
        DEPRECATED: Prefer calling phases individually for progress tracking.
        
        Args:
            passage_data: Dictionary containing passage reference and clauses.
            model: Model identifier (currently only 'claude' is supported).
            
        Returns:
            Dictionary with participants, relations, events, and discourse.
        """
        try:
            if model == "claude":
                phase1 = await AIService.analyze_participants(passage_data)
                participants = phase1["participants"]
                relations = phase1["relations"]
                
                participants_context = json.dumps(participants, indent=2, ensure_ascii=False)
                
                phase2 = await AIService.analyze_events(passage_data, participants_context)
                events = phase2["events"]
                discourse = phase2["discourse"]
                
                merged_result = {
                    "participants": participants,
                    "relations": relations,
                    "events": events,
                    "discourse": discourse
                }
                
                print(f"[AI] Analysis Complete. Merged {len(participants)} participants, {len(relations)} relations, {len(events)} events, {len(discourse)} discourse relations.")
                return merged_result
                
            else:
                raise ValueError(f"Model {model} not supported")
        except Exception as e:
            print(f"[AI] Analysis Failed: {e}")
            raise e

    @staticmethod
    async def translate_clauses(passage_data: Dict) -> Dict[str, str]:
        """
        Generate free translations for clauses.
        
        Args:
            passage_data: Dictionary containing passage reference and clauses.
            
        Returns:
            Dictionary mapping clause_id to translation.
        """
        print(f"[AI] Starting Clause Translation for: {passage_data.get('reference')}")
        
        result = await call_llm_for_json(
            system_prompt=build_translation_system_prompt(),
            user_prompt=build_passage_context(passage_data),
            model=LLMConfig.MODEL_OPUS,
            max_tokens=LLMConfig.TRANSLATION_MAX_TOKENS,
            temperature=LLMConfig.TRANSLATION_TEMPERATURE,
        )
        
        translations = result.get("translations", {})
        print(f"[AI] Translation complete. Generated {len(translations)} translations.")
        return translations

    @staticmethod
    def _validate_display_units(display_units: List[Dict], clause_ids: List[int]) -> bool:
        """
        Check that display_units cover each clause_id exactly once and only adjacent clauses.
        
        Args:
            display_units: List of display unit dictionaries.
            clause_ids: List of all clause IDs in the passage.
            
        Returns:
            True if display_units are valid, False otherwise.
        """
        if not display_units or not clause_ids:
            return bool(display_units == [] and clause_ids == [])
        seen = set()
        for unit in display_units:
            ids = unit.get("clause_ids") or []
            if not ids:
                return False
            for i, cid in enumerate(ids):
                if cid in seen or cid not in clause_ids:
                    return False
                seen.add(cid)
                if i > 0 and ids[i - 1] != cid - 1:
                    return False
            if len(ids) > 1 and ids != list(range(ids[0], ids[-1] + 1)):
                return False
        return seen == set(clause_ids)

    @staticmethod
    async def suggest_clause_merges(passage_data: Dict) -> List[Dict]:
        """
        Ask AI whether to merge adjacent clauses for display.
        
        Args:
            passage_data: Dictionary containing passage reference and clauses.
            
        Returns:
            List of display unit dictionaries with clause_ids and merged flag.
            Returns one unit per clause if AI fails or returns invalid data.
        """
        clauses = passage_data.get("clauses", [])
        clause_ids = [c.get("clause_id") for c in clauses if c.get("clause_id") is not None]
        if not clause_ids:
            return []

        default_units = [{"clause_ids": [cid], "merged": False} for cid in clause_ids]

        try:
            result = await call_llm_for_json(
                system_prompt=build_clause_merge_system_prompt(),
                user_prompt=build_clause_merge_user_prompt(passage_data),
                model=LLMConfig.MODEL_SONNET,
                max_tokens=LLMConfig.CLAUSE_MERGE_MAX_TOKENS,
                temperature=LLMConfig.CLAUSE_MERGE_TEMPERATURE,
            )
            
            units = result.get("display_units")
            if not isinstance(units, list) or not units:
                return default_units
            
            normalized = []
            for u in units:
                ids = u.get("clause_ids") if isinstance(u, dict) else None
                if not ids:
                    continue
                ids = [int(x) for x in ids]
                merged = bool(u.get("merged", len(ids) > 1))
                normalized.append({"clause_ids": ids, "merged": merged})
            
            if not AIService._validate_display_units(normalized, clause_ids):
                print("[AI] Clause merge response invalid (coverage or adjacency), using one unit per clause.")
                return default_units
            
            print(f"[AI] Clause merge: {len(normalized)} display units (from {len(clause_ids)} clauses).")
            return normalized
            
        except Exception as e:
            print(f"[AI] Clause merge failed: {e}, using one unit per clause.")
            return default_units
