from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.core.database import get_db
from app.services import export_service
from app.services.export_service import PassageNotFoundError

router = APIRouter()


@router.get("/{passage_id}/export")
async def export_passage(passage_id: str, db: Prisma = Depends(get_db)):
    try:
        return await export_service.export_tripod_format(db, passage_id)
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{passage_id}/finalize")
async def finalize_passage(passage_id: str, db: Prisma = Depends(get_db)):
    try:
        return await export_service.finalize_passage(db, passage_id)
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("")
async def list_all_passages(db: Prisma = Depends(get_db)):
    try:
        return await export_service.list_all_passages(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load passages: {str(e)}")
