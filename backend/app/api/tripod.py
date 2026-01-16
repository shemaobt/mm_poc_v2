"""
Tripod Studio API Router
Endpoints for Stage 6: Rehearsal and Approvals
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from prisma import Json
from prisma.enums import ApprovalStatus, UserRole

from app.core.database import get_db

router = APIRouter()

# ==========================================================
# MODELS
# ==========================================================

class RehearsalSegment(BaseModel):
    index: int
    text: str
    audioUrl: Optional[str] = None
    duration: Optional[float] = None

class RehearsalCreate(BaseModel):
    passageId: str
    targetLanguage: str
    fullText: str
    segments: List[Dict[str, Any]] # List of RehearsalSegment
    fullAudioUrl: Optional[str] = None
    selectedVoiceId: Optional[str] = None

class ApprovalUpdate(BaseModel):
    role: str # "validator", "mentor", "community"
    status: str # "WAITING", "PENDING", "APPROVED", "CHANGES_REQUESTED"

class RehearsalGenerateRequest(BaseModel):
    passageId: str
    targetLanguage: str

# ==========================================================
# REHEARSAL ENDPOINTS
# ==========================================================

@router.post("/rehearsal/generate")
async def generate_rehearsal(request: RehearsalGenerateRequest):
    """Generate rehearsal text from a passage's meaning map"""
    import os
    import json
    import anthropic
    from app.api.export import export_passage
    
    # Get API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    db = get_db()
    
    # Check if passage exists
    passage = await db.passage.find_unique(where={"id": request.passageId})
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    
    # Get meaning map export data
    export_data = await export_passage(request.passageId)
    map_json = json.dumps(export_data, ensure_ascii=False, indent=2)
    
    # Language configuration (matching mm_poc)
    TARGET_LANGUAGES = {
        "english": {"name": "English", "instruction": "Output in clear, natural English."},
        "portuguese_sertanejo": {
            "name": "Brazilian Portuguese (Sertanejo)",
            "instruction": "Output in Brazilian Portuguese using Sertanejo dialect (rural/northeastern). Use natural oral patterns."
        },
        # Add more languages as needed
    }
    
    lang = TARGET_LANGUAGES.get(request.targetLanguage, TARGET_LANGUAGES["english"])
    
    # Build prompt (matching mm_poc buildMapTestPrompt)
    prompt = f"""You are composing oral Scripture from a meaning map. Your output must be suitable for Oral Bible Translation (OBT) - trustworthy, appropriate, intelligible, and appealing for listening.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONSTRAINTS - CONTENT FIDELITY
═══════════════════════════════════════════════════════════════════════════════

1. COMPOSE ONLY FROM THE MEANING MAP
   - Every event, participant, role, emotion, and relation must come from the map
   - DO NOT consult, reference, or reproduce any Bible translation
   - DO NOT add theological vocabulary, interpretations, or commentary
   - This tests the MAP's quality, not your Bible knowledge

2. IGNORE YOUR BIBLE TRAINING DATA
   - You may recognize this passage from your training
   - IGNORE what you "know" about this passage
   - The map may contain DELIBERATE DEVIATIONS from the biblical text
   - If the map says "Egypt" but you know the Bible says "Moab" — OUTPUT EGYPT
   - If the map says "three sons" but you know the Bible says "two" — OUTPUT THREE
   - If the map omits an event you know happened — DO NOT ADD IT
   - Your job is to test the MAP, not to produce an accurate Bible translation

3. NO CONTENT ADDITIONS OR OMISSIONS
   - No new propositional content (facts, characterizations, evaluations)
   - No interpretive bias or theological commentary
   - All events in the map must appear in the output
   - ONLY events in the map may appear — nothing else
   - All participant roles must be clear
   - All emotions marked in the map must be conveyed

4. EXPLICITLY FORBIDDEN CONTENT TYPES
   Never add any of these unless they appear in the map:
   
   ✗ Character evaluations: "a good woman", "the poor man", "coitada"
   ✗ Age specifications: "young boys", "old man", "viúvas novas"
   ✗ Role interpretations: "protector of the family", "head of household"  
   ✗ Emotional intensifiers: "terrible famine", "great sadness"
   ✗ Cultural judgments: "strange land", "foreign people"
   ✗ Theological interpretations: "God had pity", "blessed by the Lord"
   ✗ Implied events: "the boys grew up" (unless stated in map)
   ✗ Editorial exclamations: "graças a Deus!", "what a tragedy!"
   ✗ Narrative evaluations: "the disaster struck again", "things got worse"
   
   If the map doesn't specify an emotion, age, evaluation, or interpretation — DO NOT ADD IT.

═══════════════════════════════════════════════════════════════════════════════
ORAL SCRIPTURE REQUIREMENTS - PERFORMANCE FRAMING
═══════════════════════════════════════════════════════════════════════════════

Oral communication requires PROCESS elements (performance framing) that help listeners 
follow the narrative. These are NOT content additions - they manage the communication 
channel. You MUST include these three types of oral metadiscourse:

1. ATTENTIONAL MARKERS (Phatic Function)
   - Recruit and sustain listener focus
   - Equivalent to Hebrew הִנֵּה (hineh) / Greek ἰδού (idou)
   ✓ ALLOWED: "Listen..." / "Now hear this..." / "Pay attention..."
   ✗ FORBIDDEN: "Listen, for this is important..." (evaluates content)

2. STRUCTURAL MARKERS (Discursive Function)  
   - Orient listener in time, location, topic transitions
   - Aural equivalent of paragraph breaks or section headings
   ✓ ALLOWED: "That was how X happened. Now..." / "Some time later..."
   ✗ FORBIDDEN: "That was the brave act of X..." (adds characterization)

3. TURN-TAKING MARKERS (Deictic Function)
   - Clarify who is speaking in dialogue
   - Essential because oral delivery has no quotation marks
   ✓ ALLOWED: "Then the woman said..." / "He replied..."
   ✗ FORBIDDEN: "Then the woman, filled with grief, said..." (adds emotion not in map)

THE SUBTRACTION RULE: A marker is legitimate ONLY IF:
- Removing it causes confusion about timeline, speaker, or structure
- Including it adds ZERO new theological or narrative facts

═══════════════════════════════════════════════════════════════════════════════
TARGET LANGUAGE & REGISTER
═══════════════════════════════════════════════════════════════════════════════

{lang["instruction"]}

Use ORAL, SPOKEN register throughout:
- Natural speech patterns, not literary/written style
- Appropriate for a skilled storyteller addressing a live audience
- You may reorder events if natural for target language discourse
- Use repetition for memory and emphasis where culturally appropriate
- Segment information to prevent cognitive overload

═══════════════════════════════════════════════════════════════════════════════
MEANING MAP
═══════════════════════════════════════════════════════════════════════════════

{map_json}

═══════════════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════════════

Compose the passage in {lang["name"]}.
- Follow ONLY the events and relations from the map — nothing else
- If the map contradicts your Bible knowledge, FOLLOW THE MAP
- Express all emotions indicated for participants
- Include necessary oral metadiscourse (attentional, structural, turn-taking markers)
- Make it sound like natural oral storytelling
- Add NO content beyond what the map provides

Output ONLY the composed oral Scripture passage. No explanations, notes, or commentary."""
    
    # Call Anthropic API (using claude-sonnet-4-20250514 as mm_poc does)
    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=16000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        generated_text = message.content[0].text.strip()
        
        # Segment the text (simple sentence-based segmentation)
        segments = []
        import re
        sentences = re.split(r'[.!?]+[ \n]+', generated_text)
        buffer = ''
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                buffer += sentence.strip()
                if len(buffer) >= 40 or i == len(sentences) - 1:
                    if buffer.strip():
                        segments.append({
                            "id": f"seg-{len(segments) + 1}",
                            "index": len(segments),
                            "text": buffer.strip(),
                            "audioUrl": None,
                            "duration": None
                        })
                    buffer = ''
        
        if not segments:
            segments.append({
                "id": "seg-1",
                "index": 0,
                "text": generated_text,
                "audioUrl": None,
                "duration": None
            })
        
        # Save rehearsal
        new_rehearsal = await db.rehearsal.create(
            data={
                "passageId": request.passageId,
                "targetLanguage": request.targetLanguage,
                "fullText": generated_text,
                "segments": Json(segments),
                "fullAudioUrl": None,
                "selectedVoiceId": None
            }
        )
        
        return new_rehearsal
        
    except Exception as e:
        print(f"Rehearsal generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate rehearsal: {str(e)}")

@router.post("/rehearsal")
async def save_rehearsal(rehearsal: RehearsalCreate):
    """Save or update a rehearsal for a passage"""
    db = get_db()
    
    # Check if passage exists
    passage = await db.passage.find_unique(where={"id": rehearsal.passageId})
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    # Create new rehearsal
    # Note: In a real app we might want to keep history, but for now we'll just create a new one
    # or arguably we could just update if we only want one "current" rehearsal.
    # The requirement isn't strict, but creating new allows history.
    
    new_rehearsal = await db.rehearsal.create(
        data={
            "passageId": rehearsal.passageId,
            "targetLanguage": rehearsal.targetLanguage,
            "fullText": rehearsal.fullText,
            "segments": Json(rehearsal.segments),
            "fullAudioUrl": rehearsal.fullAudioUrl,
            "selectedVoiceId": rehearsal.selectedVoiceId
        }
    )
    
    return new_rehearsal

@router.get("/rehearsal/{passage_id}")
async def get_latest_rehearsal(passage_id: str):
    """Get the latest rehearsal for a passage"""
    db = get_db()
    
    rehearsal = await db.rehearsal.find_first(
        where={"passageId": passage_id},
        order={"createdAt": "desc"}
    )
    
    if not rehearsal:
        # Return empty/null instead of 404 to make frontend logic simpler?
        # Or 404. Let's return 404 to be semantic.
        raise HTTPException(status_code=404, detail="No rehearsal found")
        
    return rehearsal

# ==========================================================
# APPROVAL ENDPOINTS
# ==========================================================

@router.patch("/approval/{passage_id}")
async def update_approval(passage_id: str, update: ApprovalUpdate):
    """Update approval status for a specific role"""
    db = get_db()
    
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    role = update.role.lower()
    
    # Map input string to Enum
    try:
        status_enum = ApprovalStatus[update.status.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {update.status}")
        
    data = {}
    if role == "validator":
        data["validatorStatus"] = status_enum
    elif role == "mentor":
        data["mentorStatus"] = status_enum
    elif role == "community":
        data["communityStatus"] = status_enum
    else:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
        
    updated_passage = await db.passage.update(
        where={"id": passage_id},
        data=data
    )
    
    return updated_passage
