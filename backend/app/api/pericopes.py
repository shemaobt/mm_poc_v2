from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional

from prisma import Prisma

from app.core.auth_middleware import get_current_approved_user, get_admin_user
from app.core.database import get_db
from app.services import pericope_service
from app.services.pericope_service import (
    LockConflictError,
    LockNotFoundError,
    NotAuthorizedError
)
from app.models.service_types import (
    ContributorInfo,
    PericopeInfo,
    LockInfo,
    LockResponse,
    UnlockResponse,
    HeartbeatResponse,
    DeleteResponse,
    ResetResponse
)

router = APIRouter(prefix="/api/pericopes", tags=["pericopes"])


@router.get("/contributors", response_model=List[ContributorInfo])
async def list_contributors(
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    """List users who have at least one passage."""
    return await pericope_service.list_contributors(db)


@router.get("", response_model=List[PericopeInfo])
async def list_pericopes(
    db: Prisma = Depends(get_db),
    book: Optional[str] = Query(None, description="Filter by book name"),
    search: Optional[str] = Query(None, description="Search by reference"),
    created_by_user_id: Optional[str] = Query(None, description="Only pericopes that have a passage created by this user"),
    limit: int = Query(100, le=500, description="Max results to return"),
):
    """List available pericopes with optional filtering and lock information."""
    return await pericope_service.list_pericopes(
        db,
        book=book,
        search=search,
        created_by_user_id=created_by_user_id,
        limit=limit
    )


@router.get("/books", response_model=List[str])
async def list_books(db: Prisma = Depends(get_db)):
    """List all unique book names in canonical order."""
    return await pericope_service.list_books(db)


@router.post("/lock/{reference:path}", response_model=LockResponse)
async def lock_pericope(
    reference: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    """Lock a pericope for the current user."""
    try:
        return await pericope_service.lock_pericope(
            db,
            reference=reference,
            user_id=current_user["sub"],
            username=current_user["username"]
        )
    except LockConflictError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "message": str(e),
                "lockedBy": e.locked_by,
                "lockedSince": e.locked_since,
            }
        )


@router.delete("/lock/{reference:path}", response_model=UnlockResponse)
async def unlock_pericope(
    reference: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    """Release a pericope lock."""
    try:
        return await pericope_service.unlock_pericope(
            db,
            reference=reference,
            user_id=current_user["sub"],
            user_role=current_user.get("role")
        )
    except NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/locks", response_model=List[LockInfo])
async def list_all_locks(db: Prisma = Depends(get_db)):
    """List all active pericope locks."""
    return await pericope_service.list_all_locks(db)


@router.put("/lock/{reference:path}/heartbeat", response_model=HeartbeatResponse)
async def heartbeat_lock(
    reference: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_approved_user)
):
    """Update the lastActivity timestamp for an active lock."""
    try:
        return await pericope_service.heartbeat_lock(
            db,
            reference=reference,
            user_id=current_user["sub"]
        )
    except LockNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/locks/all", response_model=DeleteResponse)
async def reset_all_locks(
    db: Prisma = Depends(get_db),
    admin: dict = Depends(get_admin_user)
):
    """Admin only: Delete all pericope locks."""
    return await pericope_service.reset_all_locks(db)


@router.delete("/passages/all", response_model=DeleteResponse)
async def delete_all_passages(
    db: Prisma = Depends(get_db),
    admin: dict = Depends(get_admin_user)
):
    """Admin only: Delete all passages and their related data."""
    return await pericope_service.delete_all_passages(db)


@router.delete("/reset/all", response_model=ResetResponse)
async def reset_everything(
    db: Prisma = Depends(get_db),
    admin: dict = Depends(get_admin_user)
):
    """Admin only: Complete system reset - deletes ALL data."""
    return await pericope_service.reset_everything(db)
