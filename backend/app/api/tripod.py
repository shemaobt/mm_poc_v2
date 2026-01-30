from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.services import tripod_service
from app.services.tripod_service import (
    APIKeyNotConfiguredError,
    PassageNotFoundError,
    RehearsalNotFoundError,
    InvalidApprovalRoleError,
    InvalidApprovalStatusError
)

router = APIRouter()


class RehearsalSegment(BaseModel):
    index: int
    text: str
    audioUrl: Optional[str] = None
    duration: Optional[float] = None


class RehearsalCreate(BaseModel):
    passageId: str
    targetLanguage: str
    fullText: str
    segments: List[Dict[str, Any]]
    fullAudioUrl: Optional[str] = None
    selectedVoiceId: Optional[str] = None


class ApprovalUpdate(BaseModel):
    role: str
    status: str


class RehearsalGenerateRequest(BaseModel):
    passageId: str
    targetLanguage: str


@router.post("/rehearsal/generate")
async def generate_rehearsal(request: RehearsalGenerateRequest, db: Prisma = Depends(get_db)):
    """Generate rehearsal text from a passage's meaning map."""
    try:
        return await tripod_service.generate_rehearsal(
            db,
            passage_id=request.passageId,
            target_language=request.targetLanguage
        )
    except APIKeyNotConfiguredError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate rehearsal: {str(e)}")


@router.post("/rehearsal")
async def save_rehearsal(rehearsal: RehearsalCreate, db: Prisma = Depends(get_db)):
    """Save or update a rehearsal for a passage."""
    try:
        return await tripod_service.save_rehearsal(
            db,
            passage_id=rehearsal.passageId,
            target_language=rehearsal.targetLanguage,
            full_text=rehearsal.fullText,
            segments=rehearsal.segments,
            full_audio_url=rehearsal.fullAudioUrl,
            selected_voice_id=rehearsal.selectedVoiceId
        )
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/rehearsal/{passage_id}")
async def get_latest_rehearsal(passage_id: str, db: Prisma = Depends(get_db)):
    """Get the latest rehearsal for a passage."""
    try:
        return await tripod_service.get_latest_rehearsal(db, passage_id)
    except RehearsalNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/approval/{passage_id}")
async def update_approval(passage_id: str, update: ApprovalUpdate, db: Prisma = Depends(get_db)):
    """Update approval status for a specific role."""
    try:
        return await tripod_service.update_approval(
            db,
            passage_id=passage_id,
            role=update.role,
            status=update.status
        )
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidApprovalRoleError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidApprovalStatusError as e:
        raise HTTPException(status_code=400, detail=str(e))
