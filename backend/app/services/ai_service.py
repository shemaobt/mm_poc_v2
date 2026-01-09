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
    """Construct the system prompt with schema definition"""
    return f"""
    You are an expert Biblical Hebrew linguist and semantic analyst.
    Your task is to analyze the provided Biblical Hebrew passage and extract semantic data 
    according to the Meaning Maps (TRIPOD) schema.
    
    SCHEMA DEFINITION:
    {json.dumps(TRIPOD_SCHEMA, indent=2)}
    
    OUTPUT FORMAT:
    You must return valid JSON only, matching this structure:
    {{
        "participants": [
            {{ "participantId": "p1", "hebrew": "string", "gloss": "string", "type": "string" }}
        ],
        "relations": [
            {{ "sourceId": "p1", "targetId": "p2", "category": "kinship", "type": "father" }}
        ],
        "events": [
            {{ 
                "eventId": "e1", 
                "clauseId": "c1", 
                "category": "ACTION", 
                "eventCore": "lemma", 
                "roles": [ {{ "role": "doer", "participantId": "p1" }} ],
                "modifiers": {{ "happened": "yes" }} 
            }}
        ],
        "discourse": [
            {{ "relationType": "sequence", "sourceId": "e1", "targetId": "e2" }}
        ]
    }}
    
    RULES:
    1. Extract all participants (people, groups, divine, distinct objects).
    2. Map every main verbal clause to an Event.
    3. Identify relations between participants.
    4. Connect events with discourse relations.
    5. Use the specific categories and roles from the Schema.
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
        print(f"[AI] Calling Claude API with model: claude-sonnet-4-20250514, max_tokens: 16000")
        
        try:
            # Using standard model name if the configured one looks suspicious
            # but keeping user's choice if it works. 
            # Bumping max_tokens to 8192 to prevent truncation which causes JSON errors.
            message = await client.messages.create(
                model="claude-sonnet-4-20250514",
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
                # Re-raise original error with context
                print(f"Failed JSON content preview: {content[:200]}...{content[-200:]}")
                raise e
