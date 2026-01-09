"""
Discourse API Router
"""
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.schemas import DiscourseRelationCreate, DiscourseRelationResponse
from app.services.discourse_service import DiscourseService

router = APIRouter()


@router.get("/passages/{passage_id}/discourse", response_model=List[DiscourseRelationResponse])
async def get_discourse(passage_id: str = Path(...)):
    """Get discourse relations for passage"""
    try:
        return await DiscourseService.get_by_passage(passage_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/passages/{passage_id}/discourse", response_model=DiscourseRelationResponse)
async def create_discourse(
    data: DiscourseRelationCreate,
    passage_id: str = Path(...)
):
    """Create discourse relation"""
    try:
        return await DiscourseService.create(passage_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/discourse/{id}")
async def delete_discourse(id: str = Path(...)):
    """Delete discourse relation"""
    try:
        await DiscourseService.delete(id)
        return {"status": "success", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
