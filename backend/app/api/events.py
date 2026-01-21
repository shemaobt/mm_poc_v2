"""
Events API Router
"""
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.schemas import EventCreate, EventResponse, EventPatch
from app.services.event_service import EventService

router = APIRouter()


@router.get("/passages/{passage_id}/events", response_model=List[EventResponse])
async def list_events(passage_id: str = Path(...)):
    """List events for passage"""
    try:
        return await EventService.get_by_passage(passage_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/passages/{passage_id}/events", response_model=EventResponse)
async def create_event(
    data: EventCreate,
    passage_id: str = Path(...)
):
    """Create event"""
    try:
        return await EventService.create(passage_id, data)
    except Exception as e:
        # Detailed error log could go here
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/events/{id}", response_model=EventResponse)
async def update_event(
    data: EventCreate,
    id: str = Path(...)
):
    """Update event (full update)"""
    try:
        return await EventService.update(id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/events/{id}", response_model=EventResponse)
async def patch_event(
    data: EventPatch,
    id: str = Path(...)
):
    """Partial update event (delta only)"""
    try:
        return await EventService.patch(id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/events/{id}")
async def delete_event(id: str = Path(...)):
    """Delete event"""
    try:
        await EventService.delete(id)
        return {"status": "success", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
