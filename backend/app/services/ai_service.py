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
    """Format a single clause for the prompt"""
    return f"Clause {clause.get('clause_id')} ({clause.get('clause_type', 'UNK')}): {clause.get('text')} [{clause.get('gloss')}]"

def build_passage_context(passage_data: Dict) -> str:
    """Format passage data for the prompt"""
    clauses = passage_data.get('clauses', [])
    formatted_clauses = "\n".join([build_clause_text(c) for c in clauses])
    return f"""
PASSAGE REFERENCE: {passage_data.get('reference')}
SOURCE TEXT (Hebrew/English):
{formatted_clauses}
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
    
    SCHEMA EXCERPT:
    {{
        "events": [
            {{ 
                "eventId": "e1", 
                "clauseId": "1",
                "category": "ACTION",
                "eventCore": "create", 
                "discourseFunction": "mainline",
                "narrativeFunction": "setting",
                "chainPosition": "initial",
                "roles": [ 
                    {{ "role": "doer", "participantId": "p1" }},
                    {{ "role": "undergoer", "participantId": "p2" }}
                ],
                "modifiers": {{ ... }},
                "speechAct": {{ "type": "stating", "quotationType": "direct" }},
                "pragmatic": {{ ... }},
                "emotions": [ ... ],
                "narratorStance": {{ ... }},
                "audienceResponse": {{ ... }},
                "laTags": {{ ... }},
                "figurative": {{ ... }},
                "keyTerms": [ ... ]
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
    
    KEY TERM VALUES:
    - semanticDomain: divine_name, theological, ritual, kinship, legal, geographic, cultural
    - consistency: always, preferred, flexible
    
    RULES:
    1. Map every main verbal clause to an Event with FULL details.
    2. Explicitly LINK every event to its source 'clauseId' provided in the text.
    3. Connect events with discourse relations.
    4. Use the provided participant IDs (p1, p2, etc.) in event roles.
    5. Be thorough but ground all analysis in the provided text.
    6. For events with category 'SPEECH' or 'COMMUNICATION', you MUST include the 'speechAct' object.
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
        result = await AIService._call_claude_generic(
            passage_data, 
            api_key, 
            system_prompt=build_events_system_prompt(participants_context),
            phase_name="Phase 2"
        )
        return {
            "events": result.get("events", []),
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
    async def _call_claude_generic(passage_data: Dict, api_key: str, system_prompt: str, phase_name: str = "Analysis") -> Dict[str, Any]:
        """
        Generic Claude API caller for different phases
        """
        import time
        import asyncio
        
        start_time = time.time()
        client = anthropic.AsyncAnthropic(api_key=api_key)
        user_prompt = build_passage_context(passage_data)
        
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
