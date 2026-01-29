"""
AI Service
Functional implementation for AI-powered semantic analysis
"""
import json
import anthropic
from typing import Dict, Any, List
from app.services.tripod_data import TRIPOD_SCHEMA

# ============================================================
# PURE FUNCTIONS (Prompt Building)
# ============================================================

def build_clause_text(clause: Dict) -> str:
    """Format a single clause for the prompt. Include lemma so AI can match eventCore to verb."""
    lemma = clause.get("lemma") or clause.get("lemma_ascii") or ""
    lemma_part = f" lemma={lemma}" if lemma else ""
    return f"Clause {clause.get('clause_id')} ({clause.get('clause_type', 'UNK')}{lemma_part}): {clause.get('text')} [{clause.get('gloss')}]"

def build_passage_context(passage_data: Dict) -> str:
    """Format passage data for the prompt"""
    clauses = passage_data.get('clauses', [])
    formatted_clauses = "\n".join([build_clause_text(c) for c in clauses])
    return f"""
PASSAGE REFERENCE: {passage_data.get('reference')}
SOURCE TEXT (Hebrew/English):
{formatted_clauses}
    """


def build_passage_context_with_units(passage_data: Dict) -> str:
    """
    Format passage using display_units (grouped clauses). Events will map 1:1 to display units.
    Use this when display_units exist so events align with Stage 1 grouping.
    """
    clauses = passage_data.get('clauses', [])
    clause_by_id = {c.get('clause_id'): c for c in clauses if c.get('clause_id') is not None}
    units = passage_data.get('display_units')
    if not units or not all(u.get('clause_ids') for u in units):
        return build_passage_context(passage_data)

    lines = []
    for idx, unit in enumerate(units):
        ids = unit.get('clause_ids', [])
        unit_clauses = [clause_by_id.get(cid) for cid in ids if clause_by_id.get(cid)]
        if not unit_clauses:
            continue
        combined_text = ' '.join(c.get('text', '') for c in unit_clauses)
        combined_gloss = ' '.join(c.get('gloss', '') for c in unit_clauses)
        ids_str = ','.join(str(i) for i in ids)
        merged = unit.get('merged', len(ids) > 1)
        label = f"Unit {idx + 1} (clauses {ids_str})" if merged else f"Unit {idx + 1} (clause {ids[0]})"
        lines.append(f"{label}: {combined_text} [{combined_gloss}]")
    formatted = "\n".join(lines)
    return f"""
PASSAGE REFERENCE: {passage_data.get('reference')}
DISPLAY UNITS (grouped clauses - one event per unit):
{formatted}

CRITICAL: You MUST output exactly ONE event per unit. The number of events in your response MUST equal the number of units above. Do not merge units or skip units. Use clauseIds (array of clause_ids for that unit) for each event.
    """


def build_participants_system_prompt() -> str:
    """System prompt for Phase 1: Participants & Relations"""
    return f"""
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract PARTICIPANTS and RELATIONS
    according to the Meaning Maps (TRIPOD) schema.
    
    OUTPUT FORMAT:
    Return valid JSON with 'participants' and 'relations' arrays only.
    
    SCHEMA EXCERPT:
    {{
        "participants": [
            {{ 
                "participantId": "p1", 
                "hebrew": "אֱלֹהִים", 
                "gloss": "God", 
                "type": "divine",
                "quantity": "one",
                "referenceStatus": "known",
                "properties": [ {{ "dimension": "power", "value": "omnipotent" }} ]
            }}
        ],
        "relations": [
            {{ "sourceId": "p1", "targetId": "p2", "category": "kinship", "type": "father_of" }},
            {{ "sourceId": "p3", "targetId": "p4", "category": "spatial", "type": "over" }}
        ]
    }}
    
    ALLOWED VALUES:
    - type: person, group, divine, animal, plant, object, place, abstract, time, event, collective_human, human, thing, location, deity, entity, concept, material, structure, building
    - quantity: one, two, few, many, all, mass, unknown, unified_set, collective, dual, plural, singular
    - referenceStatus: new_mention, known, pointed, kind, new, given, accessible, inferrable, brand_new, active
    
    PROPERTY DIMENSIONS & VALUES:
    - color: red, blue, green, yellow, black, white, brown, golden, purple, gray
    - size: big, small, tall, short, long, wide, narrow, thick, thin, huge, tiny
    - age: old, young, new, ancient, fresh
    - value: good, bad, beautiful, ugly, holy, unclean, righteous, wicked
    - character: wise, foolish, kind, cruel, brave, faithful, humble, proud
    - social_status: rich, poor, powerful, weak, honored, noble, free, slave
    - unity: unified, divided, scattered
    - language: one_language, many_languages
    - function: communication, speech_content, material
    - terrain: flat_plain, mountain, valley, river, desert
    - region: Mesopotamia, Canaan, Egypt, Babylon
    - direction: east, west, north, south
    
    RULES:
    1. Extract all participants (people, groups, divine, distinct objects).
    2. Identify relations between participants (kinship, spatial, possession, part_whole, social, origin).
    3. Use ONLY the allowed values listed above.
    4. Do NOT extract events or discourse relations in this phase.
    """

def build_events_system_prompt(participants_context: str) -> str:
    """System prompt for Phase 2: Events & Discourse"""
    return f"""
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract EVENTS and DISCOURSE RELATIONS
    according to the Meaning Maps (TRIPOD) schema.
    
    CONTEXT:
    The following participants have already been identified:
    {participants_context}
    
    OUTPUT FORMAT:
    Return valid JSON with 'events' and 'discourse' arrays only.
    
    SCHEMA EXCERPT (use clauseIds array when passage has display units; clauseId for single-clause units):
    {{
        "events": [
            {{ 
                "eventId": "e1", 
                "clauseId": "1",
                "clauseIds": [1, 2, 3],
                "category": "ACTION",
                "eventCore": "create", 
                "discourseFunction": "mainline",
                "narrativeFunction": "setting",
                "chainPosition": "initial",
                "roles": [ 
                    {{ "role": "doer", "participantId": "p1" }},
                    {{ "role": "undergoer", "participantId": "p2" }}
                ],
                "modifiers": {{ "happened": "yes", "realness": "real", "when": "before_now", "viewpoint": "as_whole", "phase": "none", "repetition": "once", "onPurpose": "intended", "howKnown": "saw_it", "causation": "direct" }},
                "speechAct": {{ "type": "stating", "quotationType": "direct" }},
                "pragmatic": {{ "register": "narrative_formal", "socialAxis": "peer_to_peer", "prominence": "high", "pacing": "normal" }},
                "emotions": [{{ "participantId": "p1", "primary": "grief", "secondary": "despair", "intensity": "high", "source": "contextual", "confidence": "high" }}],
                "narratorStance": {{ "stance": "sympathetic" }},
                "audienceResponse": {{ "response": "pathos" }},
                "laTags": {{
                    "emotionTags": ["grief", "despair"],
                    "eventTags": ["death", "loss"],
                    "registerTags": ["narrative_formal"],
                    "discourseTags": ["background"],
                    "socialTags": ["family"]
                }},
                "figurative": {{ "isFigurative": true, "figureType": "metaphor", "sourceDomain": "journey", "targetDomain": "life" }},
                "keyTerms": [
                    {{ "termId": "kt1", "sourceLemma": "אֱלֹהִים", "semanticDomain": "divine_name", "consistency": "always" }},
                    {{ "termId": "kt2", "sourceLemma": "בָּרָא", "semanticDomain": "theological", "consistency": "preferred" }}
                ]
            }}
        ],
        "discourse": [
            {{ "relationType": "sequence", "sourceId": "e1", "targetId": "e2" }}
        ]
    }}
    
    MODIFIER VALUES:
    - happened: yes, no, uncertain
    - realness: real, possible, required, imagined
    - when: before_now, at_now, after_now, always
    - viewpoint: as_whole, as_ongoing, as_state
    - phase: none, starting, stopping, continuing, finishing
    - repetition: once, repeated, customary
    - onPurpose: intended, unintended, unclear
    - howKnown: saw_it, sensed_it, figured_out, was_told, unspecified
    - causation: direct, caused, allowed, helped
    
    SPEECH ACT VALUES:
    - type: stating, asking_yes_no, asking_what, asking_why, asking_how, ordering, forbidding, requesting, wishing, promising, warning, greeting, exclaiming, blessing, cursing
    - quotationType: direct, indirect, free_indirect
    
    PRAGMATIC VALUES:
    - register: narrative_formal, narrative_casual, speech_formal, speech_casual, ceremonial, legal, poetic, prophetic
    - socialAxis: superior_to_inferior, inferior_to_superior, peer_to_peer, divine_to_human, human_to_divine
    - prominence: peak, high, medium, low
    - pacing: expanded, normal, compressed, abrupt
    
    EMOTION VALUES:
    - primary/secondary: joy, grief, fear, anger, love, hate, surprise, disgust, shame, pride, hope, despair, gratitude, jealousy, compassion, awe
    - intensity: low, medium, high, extreme
    - source: lexical, syntactic, somatic, actional, contextual, figurative
    - confidence: certain, high, medium, low
    
    NARRATOR/AUDIENCE VALUES:
    - stance: sympathetic, critical, neutral, ironic, celebratory, mourning, warning
    - response: pathos, fear, hope, outrage, joy, awe, relief, suspense, satisfaction
    
    FIGURATIVE VALUES:
    - figureType: metaphor, simile, metonymy, synecdoche, idiom, hyperbole, euphemism, personification, merism, hendiadys, irony, rhetorical_question
    - transferability: universal, near_universal, cultural, unique
    
    LA TAGS (Language Assistant Retrieval Tags):
    These are semantic tags that help retrieve similar passages for translation assistance.
    {{
        "emotionTags": ["grief", "joy"],      // Emotions present in this event
        "eventTags": ["death", "marriage"],   // Type of life event
        "registerTags": ["formal", "poetic"], // Discourse register
        "discourseTags": ["background", "climax"], // Narrative function
        "socialTags": ["family", "legal"]     // Social context
    }}
    
    LA TAG VALUES:
    - emotionTags: Use values from EMOTION VALUES (joy, grief, fear, anger, love, etc.)
    - eventTags: birth, death, marriage, battle, journey, covenant, blessing, curse, miracle, prophecy, judgment, rescue, creation, destruction
    - registerTags: narrative, speech, poetry, legal, prophetic, wisdom, lament, praise
    - discourseTags: setting, background, mainline, climax, resolution, flashback, foreshadowing
    - socialTags: family, royal, priestly, military, agricultural, commercial, legal, religious
    
    KEY TERM STRUCTURE:
    {{
        "termId": "kt1",           // Unique ID for this term (kt1, kt2, etc.)
        "sourceLemma": "אֱלֹהִים",   // The Hebrew lemma/word
        "semanticDomain": "divine_name",  // Category of the term
        "consistency": "always"    // How consistently it should be translated
    }}
    
    KEY TERM DOMAINS:
    - divine_name: Names of God (יהוה, אֱלֹהִים, אֲדֹנָי, אֵל, שַׁדַּי)
    - theological: Covenant/theological concepts (בְּרִית, חֶסֶד, צֶדֶק, אֱמֶת, קָדוֹשׁ, תּוֹרָה)
    - ritual: Sacrifice/purity terms (קָרְבָּן, זֶבַח, טָהוֹר, טָמֵא, כֹּהֵן)
    - kinship: Family terms (אָב, אֵם, בֵּן, בַּת, אָח, אָחוֹת)
    - legal: Legal/judicial terms (מִשְׁפָּט, דִּין, עֵד)
    - geographic: Place names (יְרוּשָׁלַיִם, צִיּוֹן, מִצְרַיִם, בָּבֶל)
    - cultural: Cultural practices/concepts unique to the text
    
    CONSISTENCY VALUES:
    - always: Must be translated the same way every time (divine names)
    - preferred: Should be consistent but context may allow variation
    - flexible: Can vary based on context
    
    RULES:
    1. Map every main verbal clause to an Event with FULL details.
    2. When passage has DISPLAY UNITS: output EXACTLY one event per unit. Number of events MUST equal number of units. Use clauseIds array (e.g. [1,2,3]) for each unit's clause_ids. When passage has raw clauses, use clauseId (string "1", "2"...).
    3. The eventCore (e.g. "go", "say", "create") MUST match the verb/action in that unit. Use the gloss or lemma from the text—do not substitute a different English word.
    4. Connect events with discourse relations.
    5. Use the provided participant IDs (p1, p2, etc.) in event roles.
    6. Be thorough but ground all analysis in the provided text.
    6. For events with category 'SPEECH' or 'COMMUNICATION', you MUST include the 'speechAct' object.
    7. For each event, identify KEY TERMS - significant Hebrew words that require consistent translation:
       - Divine names from participants with type 'divine'
       - Theologically significant verbs (create, bless, covenant, redeem, save, etc.)
       - Kinship terms when family relationships are central to the event
       - Ritual/legal terms in ceremonial or legal contexts
       Include keyTerms array even if only one term is identified. Use the Hebrew lemma from the clause or participant.
    8. For each event, provide LA TAGS (laTags) to enable semantic retrieval:
       - emotionTags: Based on the emotions detected in the event
       - eventTags: The type of life/narrative event (death, marriage, battle, etc.)
       - registerTags: The discourse register (narrative, speech, poetry, etc.)
       - discourseTags: The narrative function (setting, climax, resolution, etc.)
       - socialTags: The social context (family, royal, legal, etc.)
       Include laTags for EVERY event - these are essential for translation assistance.
    """

def build_translation_system_prompt() -> str:
    """System prompt specifically for Stage 1 free translation"""
    return """
    You are an expert Bible translator, specializing in converting Hebrew syntax into natural, readable English.
    
    TASK:
    Translate each provided Hebrew clause into a natural "free translation" in English.
    
    GUIDELINES:
    1. Accuracy: Respect the Hebrew syntax, tense, and aspect, but prioritize English flow.
    2. Readability: The output will be read by users who may not know Hebrew. It should sound like standard English.
    3. Context: Ensure consecutive clauses flow logically together as a coherent narrative.
    
    OUTPUT FORMAT:
    Return valid JSON mapping 'clause_id' to its translation.
    Example:
    {
        "translations": {
            "1": "Now it happened in the days when the judges ruled,",
            "2": "that there was a famine in the land."
        }
    }
    """


def build_clause_merge_system_prompt() -> str:
    """System prompt for AI to decide whether to merge adjacent BHSA clauses for display."""
    return """
    You are an expert Biblical Hebrew linguist. The passage is split into clauses from the BHSA/ETCBC database.
    Some clauses are very short (e.g. single-word imperatives like "Go", "return") and may read better when
    shown together as one unit for review.

    TASK:
    Decide which adjacent clauses should be MERGED into a single display unit for readability in the UI.
    You may merge zero, some, or many adjacent clauses. Do not merge non-adjacent clauses.

    RULES:
    1. Only merge ADJACENT clauses (e.g. clauses 2 and 3, or 5 and 6 and 7).
    2. Every clause_id from 1 to N must appear in exactly one display unit, in order.
    3. Merging is optional: if the passage reads fine clause-by-clause, return one unit per clause.
    4. Prefer merging when: short imperatives in sequence, or very short fragments that form one thought.
    5. Do not merge when: different speakers, different verse numbers, or distinct narrative beats.

    OUTPUT FORMAT:
    Return valid JSON with a single key "display_units", an array of objects. Each object has:
    - "clause_ids": array of integers (the BHSA clause_ids in this unit, in order)
    - "merged": true only when the unit contains more than one clause; false for single-clause units

    Example (clauses 1 single; 2 and 3 merged; 4 single):
    {
        "display_units": [
            { "clause_ids": [1], "merged": false },
            { "clause_ids": [2, 3], "merged": true },
            { "clause_ids": [4], "merged": false }
        ]
    }
    """


def build_clause_merge_user_prompt(passage_data: Dict) -> str:
    """Build user prompt for clause-merge decision: list clauses with id, text, gloss, type."""
    clauses = passage_data.get("clauses", [])
    lines = []
    for c in clauses:
        cid = c.get("clause_id")
        text = c.get("text", "")
        gloss = c.get("gloss", "")
        ctype = c.get("clause_type", "")
        lines.append(f"Clause {cid} (v{c.get('verse', '?')}, {ctype}): {text} [{gloss}]")
    ref = passage_data.get("reference", "")
    return f"Passage: {ref}\n\nClauses:\n" + "\n".join(lines) + "\n\nReturn display_units as JSON."


# ============================================================
# SERVICE FUNCTIONS (API Calls)
# ============================================================

class AIService:
    
    @staticmethod
    async def analyze_participants(passage_data: Dict, api_key: str) -> Dict[str, Any]:
        """Phase 1: Analyze Participants & Relations"""
        print(f"[AI] Starting Phase 1: Participants & Relations for {passage_data.get('reference')}")
        result = await AIService._call_claude_generic(
            passage_data, 
            api_key, 
            system_prompt=build_participants_system_prompt(),
            phase_name="Phase 1"
        )
        return {
            "participants": result.get("participants", []),
            "relations": result.get("relations", [])
        }

    @staticmethod
    async def analyze_events(passage_data: Dict, participants_context: str, api_key: str) -> Dict[str, Any]:
        """Phase 2: Analyze Events & Discourse (requires Phase 1 context)"""
        print(f"[AI] Starting Phase 2: Events & Discourse for {passage_data.get('reference')}")
        num_units = len(passage_data.get("display_units") or [])
        num_clauses = len(passage_data.get("clauses") or [])
        if num_units:
            print(f"[AI] Input: {num_units} display units, {num_clauses} raw clauses")
        result = await AIService._call_claude_generic(
            passage_data, 
            api_key, 
            system_prompt=build_events_system_prompt(participants_context),
            phase_name="Phase 2"
        )
        events = result.get("events", [])
        print(f"[AI] Phase 2 returned {len(events)} events (display_units={num_units})")
        if num_units and len(events) != num_units:
            print(f"[AI] WARNING: event count ({len(events)}) != display unit count ({num_units}). AI may have merged/skipped units.")
        return {
            "events": events,
            "discourse": result.get("discourse", [])
        }

    @staticmethod
    async def analyze_passage(passage_data: Dict, api_key: str, model: str = "claude") -> Dict[str, Any]:
        """
        Main entry point for AI analysis - Orchestrates 2-Phase Analysis
        DEPRECATED: Prefer calling phases individually for progress tracking.
        """
        try:
            if model == "claude":
                # Phase 1
                phase1 = await AIService.analyze_participants(passage_data, api_key)
                participants = phase1["participants"]
                relations = phase1["relations"]
                
                # Context
                participants_context = json.dumps(participants, indent=2, ensure_ascii=False)
                
                # Phase 2
                phase2 = await AIService.analyze_events(passage_data, participants_context, api_key)
                events = phase2["events"]
                discourse = phase2["discourse"]
                
                # Merge
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
    async def translate_clauses(passage_data: Dict, api_key: str) -> Dict[str, str]:
        """
        Generate free translations for clauses
        """
        import time
        import asyncio
        from app.services.ai_service import build_translation_system_prompt, build_passage_context # Ensure imports

        print(f"[AI] Starting Clause Translation for: {passage_data.get('reference')}")
        
        client = anthropic.AsyncAnthropic(api_key=api_key)
        
        user_prompt = build_passage_context(passage_data)
        system_prompt = build_translation_system_prompt()
        
        retries = 5
        base_delay = 3
        
        for attempt in range(retries):
            try:
                message = await client.messages.create(
                    model="claude-opus-4-5-20251101",
                    max_tokens=4000,
                    temperature=0.3, # Slightly higher for natural flow
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                
                content = message.content[0].text
                result = AIService._clean_and_parse_json(content)
                
                translations = result.get("translations", {})
                print(f"[AI] Translation complete. Generated {len(translations)} translations.")
                return translations
                
            except Exception as e:
                is_overloaded = "529" in str(e) or "overloaded" in str(e).lower()
                if is_overloaded and attempt < retries - 1:
                    sleep_time = base_delay * (2 ** attempt)
                    print(f"[AI] API Overloaded (529). Retrying in {sleep_time}s... (Attempt {attempt + 1}/{retries})")
                    await asyncio.sleep(sleep_time)
                    continue
                
                print(f"[AI] Translation Error: {e}")
                raise e

    @staticmethod
    def _validate_display_units(display_units: List[Dict], clause_ids: List[int]) -> bool:
        """Check that display_units cover each clause_id exactly once and only adjacent clauses."""
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
                    return False  # not adjacent
            if len(ids) > 1 and ids != list(range(ids[0], ids[-1] + 1)):
                return False  # gap inside unit
        return seen == set(clause_ids)

    @staticmethod
    async def suggest_clause_merges(passage_data: Dict, api_key: str) -> List[Dict]:
        """
        Ask AI whether to merge adjacent clauses for display. Returns display_units:
        list of { clause_ids: [int], merged: bool }. If AI fails or returns invalid, returns one unit per clause.
        """
        import asyncio
        clauses = passage_data.get("clauses", [])
        clause_ids = [c.get("clause_id") for c in clauses if c.get("clause_id") is not None]
        if not clause_ids:
            return []

        default_units = [{"clause_ids": [cid], "merged": False} for cid in clause_ids]

        try:
            client = anthropic.AsyncAnthropic(api_key=api_key)
            message = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                temperature=0.2,
                system=build_clause_merge_system_prompt(),
                messages=[{"role": "user", "content": build_clause_merge_user_prompt(passage_data)}],
            )
            content = message.content[0].text
            result = AIService._clean_and_parse_json(content)
            units = result.get("display_units")
            if not isinstance(units, list) or not units:
                return default_units
            # Normalize: ensure clause_ids and merged
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

    @staticmethod
    async def _call_claude_generic(passage_data: Dict, api_key: str, system_prompt: str, phase_name: str = "Analysis") -> Dict[str, Any]:
        """
        Generic Claude API caller for different phases
        """
        import time
        import asyncio
        
        start_time = time.time()
        client = anthropic.AsyncAnthropic(api_key=api_key)
        # Use display units when available (Phase 2) so events align with Stage 1 grouping
        use_units = bool(passage_data.get("display_units") and phase_name and "Phase 2" in phase_name)
        num_units = len(passage_data.get("display_units") or []) if use_units else 0
        if use_units:
            print(f"[AI] Phase 2 using display_units: {num_units} units (expect 1 event per unit)")
        user_prompt = build_passage_context_with_units(passage_data) if use_units else build_passage_context(passage_data)
        
        print(f"[AI] Calling Claude ({phase_name})...")
        
        retries = 5
        base_delay = 3
        
        for attempt in range(retries):
            try:
                message = await client.messages.create(
                    model="claude-opus-4-5-20251101",
                    max_tokens=64000, # Increased limit safety net
                    temperature=0,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                
                api_time = time.time() - start_time
                print(f"[AI] Claude ({phase_name}) completed in {api_time:.2f}s")
                print(f"[AI] Usage: {message.usage}")
                
                content = message.content[0].text
                result = AIService._clean_and_parse_json(content)
                return result
                
            except Exception as e:
                is_overloaded = "529" in str(e) or "overloaded" in str(e).lower()
                if is_overloaded and attempt < retries - 1:
                    sleep_time = base_delay * (2 ** attempt)
                    print(f"[AI] API Overloaded (529). Retrying in {sleep_time}s... (Attempt {attempt + 1}/{retries})")
                    await asyncio.sleep(sleep_time)
                    continue
                
                print(f"AI Error ({phase_name}): {e}")
                raise e

    @staticmethod
    def _clean_and_parse_json(content: str) -> Dict[str, Any]:
        """Robust JSON cleaning and parsing with truncation repair"""
        import re
        
        content = content.strip()
        
        # remove markdown code blocks
        if "```" in content:
            pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
            match = re.search(pattern, content)
            if match:
                content = match.group(1).strip()
        
        # If still not bare JSON, try to find the outer braces
        if not (content.startswith("{") and content.endswith("}")):
            start = content.find("{")
            # Don't strictly enforce end brace if we suspect truncation
            if start != -1:
                content = content[start:]
        
        # Attempt to parse
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Attempt to repair truncation
            try:
                print(f"[AI] JSON parse failed. Attempting to repair truncation. Content length: {len(content)}")
                fixed_content = AIService._repair_truncated_json(content)
                return json.loads(fixed_content)
            except Exception as e2:
                # Last ditch effort: try to fix common trailing comma issues
                try:
                    # Remove trailing commas before closing braces/brackets
                    fixed_content = re.sub(r",\s*([\]}])", r"\1", content)
                    return json.loads(fixed_content)
                except Exception:
                    # Re-raise original error with context
                    print(f"[AI] JSON REPAIR FAILED. Content length: {len(content)}")
                    print(f"TAIL of content: {content[-200:]}")
                    raise e2

    @staticmethod
    def _repair_truncated_json(json_str: str) -> str:
        """
        Simple heuristic to close open braces/brackets for truncated JSON.
        """
        # Remove any trailing incomplete string (e.g. "val...)
        # Find the last quote
        last_quote_idx = json_str.rfind('"')
        
        stack = []
        in_string = False
        escape = False
        
        for i, char in enumerate(json_str):
            if in_string:
                if escape:
                    escape = False
                elif char == '\\':
                    escape = True
                elif char == '"':
                    in_string = False
            else:
                if char == '"':
                    in_string = True
                elif char == '{':
                    stack.append('}')
                elif char == '[':
                    stack.append(']')
                elif char == '}' or char == ']':
                    if stack:
                        expected = stack.pop()
                        if char != expected:
                            json_str = json_str[:i]
                            break
                    else:
                        pass
        
        if in_string:
            json_str += '"'
            
        json_str = json_str.rstrip()
        if json_str.endswith(','):
            json_str = json_str[:-1]
            
        while stack:
            json_str += stack.pop()
            
        return json_str
