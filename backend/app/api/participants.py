from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.schemas import ParticipantCreate, ParticipantResponse
from app.services.participant_service import ParticipantService

router = APIRouter()


@router.get("/passages/{passage_id}/participants", response_model=List[ParticipantResponse])
async def list_participants(passage_id: str = Path(...)):
    """List participants for passage"""
    try:
        return await ParticipantService.get_by_passage(passage_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/passages/{passage_id}/participants", response_model=ParticipantResponse)
async def create_participant(
    data: ParticipantCreate,
    passage_id: str = Path(...)
):
    """Create participant"""
    try:
        return await ParticipantService.create(passage_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/participants/{id}", response_model=ParticipantResponse)
async def update_participant(
    data: ParticipantCreate,
    id: str = Path(...)
):
    """Update participant"""
    try:
        return await ParticipantService.update(id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/participants/{id}")
async def delete_participant(id: str = Path(...)):
    """Delete participant"""
    try:
        await ParticipantService.delete(id)
        return {"status": "success", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
