"""
Pericopes API - List and search available pericopes
Includes locking functionality to prevent concurrent editing
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from prisma import Prisma

from app.core.database import get_db
from app.core.auth_middleware import get_current_approved_user

router = APIRouter(prefix="/api/pericopes", tags=["pericopes"])


class PericopeResponse(BaseModel):
    id: str
    reference: str
    book: str
    chapterStart: int
    verseStart: int
    chapterEnd: Optional[int]
    verseEnd: Optional[int]


class LockInfo(BaseModel):
    pericopeRef: str
    userId: str
    userName: str
    startedAt: str
    lastActivity: str


class PericopeWithLockResponse(BaseModel):
    id: str
    reference: str
    book: str
    chapterStart: int
    verseStart: int
    chapterEnd: Optional[int]
    verseEnd: Optional[int]
    lock: Optional[LockInfo] = None


@router.get("", response_model=List[PericopeWithLockResponse])
async def list_pericopes(
    book: Optional[str] = Query(None, description="Filter by book name"),
    search: Optional[str] = Query(None, description="Search by reference"),
    limit: int = Query(100, le=500, description="Max results to return"),
):
    """
    List available pericopes with optional filtering.
    Includes lock information for each pericope.
    """
    db = get_db()
    
    where = {}
    
    if book:
        where["book"] = book
    
    if search:
        where["reference"] = {"contains": search, "mode": "insensitive"}
    
    pericopes = await db.pericope.find_many(
        where=where,
        order={"reference": "asc"},
        take=limit,
    )
    
    # Get all locks for the references we found
    refs = [p.reference for p in pericopes]
    locks = await db.pericopelock.find_many(
        where={"pericopeRef": {"in": refs}}
    )
    locks_map = {lock.pericopeRef: lock for lock in locks}
    
    result = []
    for p in pericopes:
        lock_data = None
        if p.reference in locks_map:
            lock = locks_map[p.reference]
            lock_data = LockInfo(
                pericopeRef=lock.pericopeRef,
                userId=lock.userId,
                userName=lock.userName,
                startedAt=lock.startedAt.isoformat(),
                lastActivity=lock.lastActivity.isoformat(),
            )
        
        result.append(PericopeWithLockResponse(
            id=p.id,
            reference=p.reference,
            book=p.book,
            chapterStart=p.chapterStart,
            verseStart=p.verseStart,
            chapterEnd=p.chapterEnd,
            verseEnd=p.verseEnd,
            lock=lock_data,
        ))
    
    return result


@router.get("/books", response_model=List[str])
async def list_books():
    """
    List all unique book names that have pericopes.
    """
    db = get_db()
    
    # Get distinct books
    pericopes = await db.pericope.find_many(
        distinct=["book"],
        order={"book": "asc"},
    )
    
    # Order by canonical order
    OT_ORDER = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
        "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Song of Songs",
        "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
        "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
        "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    ]
    
    books = [p.book for p in pericopes]
    # Sort by canonical order
    ordered_books = [b for b in OT_ORDER if b in books]
    # Add any books not in OT_ORDER at the end
    remaining = [b for b in books if b not in OT_ORDER]
    
    return ordered_books + remaining


# ============================================================
# PERICOPE LOCKING ENDPOINTS
# ============================================================

@router.post("/lock/{reference:path}")
async def lock_pericope(
    reference: str,
    current_user: dict = Depends(get_current_approved_user)
):
    """
    Lock a pericope for the current user.
    If already locked by the same user, updates lastActivity.
    If locked by another user, returns 409 Conflict.
    """
    db = get_db()
    
    # Check if already locked
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if existing_lock:
        # If locked by the same user, just update activity
        if existing_lock.userId == current_user["sub"]:
            updated = await db.pericopelock.update(
                where={"id": existing_lock.id},
                data={"lastActivity": datetime.utcnow()}
            )
            return {
                "status": "extended",
                "message": "Lock extended",
                "lock": {
                    "pericopeRef": updated.pericopeRef,
                    "userId": updated.userId,
                    "userName": updated.userName,
                    "startedAt": updated.startedAt.isoformat(),
                    "lastActivity": updated.lastActivity.isoformat(),
                }
            }
        else:
            # Locked by someone else
            raise HTTPException(
                status_code=409,
                detail={
                    "message": f"Pericope is being analyzed by {existing_lock.userName}",
                    "lockedBy": existing_lock.userName,
                    "lockedSince": existing_lock.startedAt.isoformat(),
                }
            )
    
    # Create new lock
    lock = await db.pericopelock.create(
        data={
            "pericopeRef": reference,
            "userId": current_user["sub"],
            "userName": current_user["username"],
            "startedAt": datetime.utcnow(),
            "lastActivity": datetime.utcnow(),
        }
    )
    
    return {
        "status": "locked",
        "message": "Pericope locked successfully",
        "lock": {
            "pericopeRef": lock.pericopeRef,
            "userId": lock.userId,
            "userName": lock.userName,
            "startedAt": lock.startedAt.isoformat(),
            "lastActivity": lock.lastActivity.isoformat(),
        }
    }


@router.delete("/lock/{reference:path}")
async def unlock_pericope(
    reference: str,
    current_user: dict = Depends(get_current_approved_user)
):
    """
    Release a pericope lock.
    Only the owner or an admin can release it.
    """
    db = get_db()
    
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if not existing_lock:
        return {"status": "not_locked", "message": "Pericope was not locked"}
    
    # Check authorization: owner or admin
    is_owner = existing_lock.userId == current_user["sub"]
    is_admin = current_user.get("role") == "admin"
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only the lock owner or an admin can release this lock"
        )
    
    await db.pericopelock.delete(where={"id": existing_lock.id})
    
    return {"status": "unlocked", "message": "Pericope unlocked successfully"}


@router.get("/locks", response_model=List[LockInfo])
async def list_all_locks():
    """
    List all active pericope locks.
    """
    db = get_db()
    
    locks = await db.pericopelock.find_many(
        order={"startedAt": "desc"}
    )
    
    return [
        LockInfo(
            pericopeRef=lock.pericopeRef,
            userId=lock.userId,
            userName=lock.userName,
            startedAt=lock.startedAt.isoformat(),
            lastActivity=lock.lastActivity.isoformat(),
        )
        for lock in locks
    ]


@router.put("/lock/{reference:path}/heartbeat")
async def heartbeat_lock(
    reference: str,
    current_user: dict = Depends(get_current_approved_user)
):
    """
    Update the lastActivity timestamp for an active lock.
    Used to keep the lock alive during long analysis sessions.
    """
    db = get_db()
    
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if not existing_lock:
        raise HTTPException(status_code=404, detail="Lock not found")
    
    if existing_lock.userId != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not your lock")
    
    updated = await db.pericopelock.update(
        where={"id": existing_lock.id},
        data={"lastActivity": datetime.utcnow()}
    )
    
    return {"status": "ok", "lastActivity": updated.lastActivity.isoformat()}


# ============================================================
# ADMIN-ONLY BULK OPERATIONS
# ============================================================

from app.core.auth_middleware import get_admin_user

@router.delete("/locks/all")
async def reset_all_locks(admin: dict = Depends(get_admin_user)):
    """
    Admin only: Delete all pericope locks (reset all in-progress work).
    """
    db = get_db()
    
    result = await db.pericopelock.delete_many()
    
    return {
        "status": "success",
        "message": f"All locks have been reset",
        "deleted_count": result
    }


@router.delete("/passages/all")
async def delete_all_passages(admin: dict = Depends(get_admin_user)):
    """
    Admin only: Delete all passages and their related data.
    This is a destructive operation - use with caution.
    """
    db = get_db()
    
    # First, delete all locks
    await db.pericopelock.delete_many()
    
    # Count passages before deletion
    passage_count = await db.passage.count()
    
    # Delete all passages (cascade will handle related entities)
    await db.passage.delete_many()
    
    return {
        "status": "success",
        "message": f"All passages and related data have been deleted",
        "deleted_count": passage_count
    }


@router.delete("/reset/all")
async def reset_everything(admin: dict = Depends(get_admin_user)):
    """
    Admin only: Complete system reset - deletes ALL data.
    This includes: passages, locks, metrics, snapshots, edit logs.
    WARNING: This is a destructive operation that cannot be undone.
    """
    db = get_db()
    
    deleted_counts = {}
    
    # Delete all pericope locks
    deleted_counts["locks"] = await db.pericopelock.delete_many()
    
    # Delete all edit logs (before snapshots due to FK)
    deleted_counts["edit_logs"] = await db.editlog.delete_many()
    
    # Delete all AI snapshots
    deleted_counts["snapshots"] = await db.aisnapshot.delete_many()
    
    # Delete all metrics summaries
    deleted_counts["metrics"] = await db.metricssummary.delete_many()
    
    # Delete all passages (cascade handles related entities like clauses, participants, etc.)
    deleted_counts["passages"] = await db.passage.delete_many()
    
    return {
        "status": "success",
        "message": "Complete system reset performed. All data has been deleted.",
        "deleted_counts": deleted_counts
    }

