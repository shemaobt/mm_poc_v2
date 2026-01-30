from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Optional
from pydantic import BaseModel
from prisma import Prisma

from app.core.database import get_db
from app.services import metrics_service
from app.services.metrics_service import (
    PassageNotFoundError,
    SnapshotNotFoundError,
    InvalidDateFormatError
)

router = APIRouter()


class SnapshotCreate(BaseModel):
    passage_id: str
    snapshot_data: Any


class EditLogCreate(BaseModel):
    snapshot_id: str
    action: str
    entity_type: str
    entity_id: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    is_ai_generated: bool = False


@router.post("/snapshot")
async def create_snapshot(data: SnapshotCreate, db: Prisma = Depends(get_db)):
    """Create a new AI snapshot when prefill completes."""
    try:
        return await metrics_service.create_snapshot(
            db,
            passage_id=data.passage_id,
            snapshot_data=data.snapshot_data
        )
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/log")
async def log_edit(data: EditLogCreate, db: Prisma = Depends(get_db)):
    """Log a user edit action."""
    try:
        return await metrics_service.log_edit(
            db,
            snapshot_id=data.snapshot_id,
            action=data.action,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            field_name=data.field_name,
            old_value=data.old_value,
            new_value=data.new_value,
            is_ai_generated=data.is_ai_generated
        )
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/aggregate")
async def get_aggregate_metrics(
    time_range: Optional[str] = Query(None, description="Time range filter: 'today', 'week', 'month', 'all'"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format: YYYY-MM-DD)"),
    db: Prisma = Depends(get_db)
):
    """Get global aggregated metrics for admin dashboard."""
    try:
        return await metrics_service.get_aggregate_metrics(
            db,
            time_range=time_range,
            start_date=start_date,
            end_date=end_date
        )
    except InvalidDateFormatError as e:
        raise HTTPException(status_code=400, detail=str(e))
