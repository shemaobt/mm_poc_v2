from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from prisma import Prisma
from typing import Optional

from app.core.auth_middleware import get_current_approved_user
from app.core.database import get_db
from app.services import passage_service
from app.services.passage_service import (
    PassageNotFoundError,
    BHSADataError,
    NotAuthorizedError
)

router = APIRouter()


class PassageCreate(BaseModel):
    reference: str
    sourceLang: str = "hbo"
    peakEvent: Optional[str] = None
    thematicSpine: Optional[str] = None


@router.get("")
async def list_passages(db: Prisma = Depends(get_db)):
    return await passage_service.list_passages(db)


@router.get("/{passage_id}")
async def get_passage(passage_id: str, db: Prisma = Depends(get_db)):
    try:
        return await passage_service.get_passage(db, passage_id)
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("")
async def create_passage(
    passage: PassageCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    try:
        return await passage_service.create_passage(
            db,
            reference=passage.reference,
            source_lang=passage.sourceLang,
            user_id=current_user.get("sub")
        )
    except BHSADataError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{passage_id}")
async def delete_passage(
    passage_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    try:
        return await passage_service.delete_passage(
            db,
            passage_id=passage_id,
            user_id=current_user.get("sub"),
            user_roles=current_user.get("roles", [])
        )
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
