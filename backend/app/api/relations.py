"""
Relations API Router
"""
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.schemas import RelationCreate, RelationResponse
from app.services.relation_service import RelationService

router = APIRouter()


@router.get("/passages/{passage_id}/relations", response_model=List[RelationResponse])
async def list_relations(passage_id: str = Path(...)):
    """List relations for passage"""
    try:
        return await RelationService.get_by_passage(passage_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/passages/{passage_id}/relations", response_model=RelationResponse)
async def create_relation(
    data: RelationCreate,
    passage_id: str = Path(...)
):
    """Create relation"""
    try:
        return await RelationService.create(passage_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/relations/{relation_id}", response_model=RelationResponse)
async def update_relation(
    relation_id: str = Path(...),
    data: RelationCreate = ...,
):
    """Update relation"""
    try:
        return await RelationService.update(relation_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/relations/{id}")
async def delete_relation(id: str = Path(...)):
    """Delete relation"""
    try:
        await RelationService.delete(id)
        return {"status": "success", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
