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

def build_system_prompt() -> str:
    """Construct the system prompt with comprehensive schema definition"""
    return f"""
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract semantic data 
    according to the Meaning Maps (TRIPOD) schema.
    
    SCHEMA DEFINITION:
    {json.dumps(TRIPOD_SCHEMA, indent=2)}
    
    OUTPUT FORMAT:
    You must return valid JSON only, matching this comprehensive structure:
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
        ],
        "events": [
            {{ 
                "eventId": "e1", 
                "category": "ACTION",
                "eventCore": "create", 
                "discourseFunction": "mainline",
                "narrativeFunction": "setting",
                "chainPosition": "initial",
                "roles": [ 
                    {{ "role": "doer", "participantId": "p1" }},
                    {{ "role": "undergoer", "participantId": "p2" }}
                ],
                "modifiers": {{
                    "happened": "yes",
                    "realness": "real",
                    "when": "before_now",
                    "viewpoint": "as_whole",
                    "phase": "none",
                    "repetition": "once",
                    "onPurpose": "intended",
                    "howKnown": "unspecified",
                    "causation": "direct"
                }},
                "pragmatic": {{
                    "register": "narrative_formal",
                    "socialAxis": "divine_to_human",
                    "prominence": "high",
                    "pacing": "normal"
                }},
                "emotions": [
                    {{
                        "participantId": "p1",
                        "primary": "satisfaction",
                        "intensity": "medium",
                        "source": "actional",
                        "confidence": "medium"
                    }}
                ],
                "narratorStance": {{ "stance": "neutral" }},
                "audienceResponse": {{ "response": "awe" }},
                "laTags": {{
                    "emotionTags": ["wonder", "awe"],
                    "eventTags": ["creation", "divine_action"],
                    "registerTags": ["formal_narrative"],
                    "discourseTags": ["opening"],
                    "socialTags": ["divine_speech"]
                }},
                "figurative": {{
                    "isFigurative": false
                }},
                "keyTerms": [
                    {{
                        "termId": "kt1",
                        "sourceLemma": "ברא",
                        "semanticDomain": "theological",
                        "consistency": "always"
                    }}
                ]
            }}
        ],
        "discourse": [
            {{ "relationType": "sequence", "sourceId": "e1", "targetId": "e2" }}
        ]
    }}
    
    MODIFIER VALUES (use these exact values):
    - happened: yes, no, uncertain
    - realness: real, possible, required, imagined
    - when: before_now, at_now, after_now, always
    - viewpoint: as_whole, as_ongoing, as_state
    - phase: none, starting, stopping, continuing, finishing
    - repetition: once, repeated, customary
    - onPurpose: intended, unintended, unclear
    - howKnown: saw_it, sensed_it, figured_out, was_told, unspecified
    - causation: direct, caused, allowed, helped
    
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
    1. Extract all participants (people, groups, divine, distinct objects).
    2. Map every main verbal clause to an Event with FULL details.
    3. Identify relations between participants (kinship, spatial, possession, part_whole, social, origin).
    4. Connect events with discourse relations.
    5. For EACH event, provide:
       - All modifiers (9 fields)
       - Pragmatic info (register, social axis, prominence, pacing)
       - Emotions if detectable (who feels what)
       - Narrator stance and intended audience response
       - LA Tags for retrieval
       - Figurative language if present
       - Key terms for important theological/ritual vocabulary
    6. Be thorough but accurate - only mark emotions/figurative when evidence supports it.
    """

# ============================================================
# SERVICE FUNCTIONS (API Calls)
# ============================================================

class AIService:
    
    @staticmethod
    async def analyze_passage(passage_data: Dict, api_key: str, model: str = "claude") -> Dict[str, Any]:
        """
        Main entry point for AI analysis
        """
        if model == "claude":
            return await AIService._call_claude(passage_data, api_key)
        else:
            raise ValueError(f"Model {model} not supported")

    @staticmethod
    async def _call_claude(passage_data: Dict, api_key: str) -> Dict[str, Any]:
        """
        Call Anthropic Claude API
        """
        import time
        
        print(f"[AI] Starting Claude analysis for passage: {passage_data.get('reference')}")
        start_time = time.time()
        
        client = anthropic.AsyncAnthropic(api_key=api_key)
        
        user_prompt = build_passage_context(passage_data)
        system_prompt = build_system_prompt()
        
        print(f"[AI] Prompts built. User prompt length: {len(user_prompt)} chars")
        print(f"[AI] Calling Claude API with model: claude-opus-4-5-20251101, max_tokens: 16000")
        
        try:
            # Using the latest Opus 4.5 model as requested by user
            message = await client.messages.create(
                model="claude-opus-4-5-20251101",
                max_tokens=16000,
                temperature=0,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            api_time = time.time() - start_time
            print(f"[AI] Claude API call completed in {api_time:.2f}s")
            print(f"[AI] Response length: {len(message.content[0].text)} chars")
            print(f"[AI] Usage: {message.usage}")
            
            # Parse response
            print(f"[AI] Parsing JSON response...")
            content = message.content[0].text
            result = AIService._clean_and_parse_json(content)
            
            total_time = time.time() - start_time
            print(f"[AI] Total analysis completed in {total_time:.2f}s")
            print(f"[AI] Result summary: {len(result.get('participants', []))} participants, "
                  f"{len(result.get('relations', []))} relations, "
                  f"{len(result.get('events', []))} events, {len(result.get('discourse', []))} discourse relations")
            
            return result
            
        except Exception as e:
            print(f"AI Error: {e}")
            if hasattr(e, 'response'):
                print(f"Response: {e.response}")
            raise e

    @staticmethod
    def _clean_and_parse_json(content: str) -> Dict[str, Any]:
        """Robuts JSON cleaning and parsing"""
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
            end = content.rfind("}")
            if start != -1 and end != -1:
                content = content[start:end+1]
        
        # Attempt to parse
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            # Last ditch effort: try to fix common trailing comma issues
            try:
                # Remove trailing commas before closing braces/brackets
                fixed_content = re.sub(r",\s*([\]}])", r"\1", content)
                return json.loads(fixed_content)
            except Exception:
                # Re-raise original error with context and FULL content for debugging
                print(f"JSON PARSE FAILED. Content length: {len(content)}")
                print(f"TAIL of content: {content[-500:]}")
                raise e
