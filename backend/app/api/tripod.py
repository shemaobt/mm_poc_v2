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

# ==========================================================
# REHEARSAL ENDPOINTS
# ==========================================================

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
