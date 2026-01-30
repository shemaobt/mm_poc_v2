from datetime import datetime
from typing import List, Optional, Any

from prisma import Prisma

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


OT_CANONICAL_ORDER = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Song of Songs",
    "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
    "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
]


class LockConflictError(Exception):
    """Raised when a lock conflict occurs."""
    
    def __init__(self, message: str, locked_by: str, locked_since: str):
        super().__init__(message)
        self.locked_by = locked_by
        self.locked_since = locked_since


class LockNotFoundError(Exception):
    """Raised when a lock is not found."""
    pass


class NotAuthorizedError(Exception):
    """Raised when a user is not authorized for an operation."""
    pass


async def list_contributors(db: Prisma) -> List[ContributorInfo]:
    """
    List users who have at least one passage.
    
    Returns:
        A list of ContributorInfo objects with id and username.
    """
    passages = await db.passage.find_many(
        where={"userId": {"not": None}},
        distinct=["userId"],
    )
    user_ids = [p.userId for p in passages if p.userId]
    if not user_ids:
        return []
    users = await db.user.find_many(
        where={"id": {"in": user_ids}},
        select={"id": True, "username": True},
        order={"username": "asc"},
    )
    return [ContributorInfo(id=u.id, username=u.username) for u in users]


async def list_pericopes(
    db: Prisma,
    book: Optional[str] = None,
    search: Optional[str] = None,
    created_by_user_id: Optional[str] = None,
    limit: int = 100
) -> List[PericopeInfo]:
    """
    List available pericopes with optional filtering and lock information.
    
    Args:
        book: Optional book name filter.
        search: Optional search term for reference.
        created_by_user_id: Optional filter for passages created by this user.
        limit: Maximum number of results.
        
    Returns:
        A list of PericopeInfo objects with lock information.
    """
    
    where: dict = {}
    
    if created_by_user_id:
        refs_result = await db.passage.find_many(
            where={"userId": created_by_user_id},
            distinct=["reference"],
        )
        ref_list = [p.reference for p in refs_result]
        if not ref_list:
            return []
        where["reference"] = {"in": ref_list}
    
    if book:
        where["book"] = book
    
    if search:
        if "reference" in where:
            where = {"AND": [where, {"reference": {"contains": search, "mode": "insensitive"}}]}
        else:
            where["reference"] = {"contains": search, "mode": "insensitive"}
    
    pericopes = await db.pericope.find_many(
        where=where,
        order=[
            {"book": "asc"},
            {"chapterStart": "asc"},
            {"verseStart": "asc"},
        ],
        take=limit,
    )
    
    refs = [p.reference for p in pericopes]
    locks = await db.pericopelock.find_many(
        where={"pericopeRef": {"in": refs}}
    )
    locks_map = {lock.pericopeRef: lock for lock in locks}
    
    result = []
    for p in pericopes:
        lock_info = None
        if p.reference in locks_map:
            lock = locks_map[p.reference]
            lock_info = LockInfo(
                pericopeRef=lock.pericopeRef,
                userId=lock.userId,
                userName=lock.userName,
                startedAt=lock.startedAt.isoformat(),
                lastActivity=lock.lastActivity.isoformat(),
            )
        
        result.append(PericopeInfo(
            id=p.id,
            reference=p.reference,
            book=p.book,
            chapterStart=p.chapterStart,
            verseStart=p.verseStart,
            chapterEnd=p.chapterEnd,
            verseEnd=p.verseEnd,
            lock=lock_info,
        ))
    
    return result


async def list_books(db: Prisma) -> List[str]:
    """
    List all unique book names in canonical order.
    
    Returns:
        A list of book names.
    """
    
    pericopes = await db.pericope.find_many(
        distinct=["book"],
        order={"book": "asc"},
    )
    
    books = [p.book for p in pericopes]
    ordered_books = [b for b in OT_CANONICAL_ORDER if b in books]
    remaining = [b for b in books if b not in OT_CANONICAL_ORDER]
    
    return ordered_books + remaining


async def lock_pericope(db: Prisma, reference: str, user_id: str, username: str) -> LockResponse:
    """
    Lock a pericope for a user.
    
    Args:
        reference: The pericope reference.
        user_id: The user's ID.
        username: The user's username.
        
    Returns:
        A LockResponse with lock status and info.
        
    Raises:
        LockConflictError: If locked by another user.
    """
    
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if existing_lock:
        if existing_lock.userId == user_id:
            updated = await db.pericopelock.update(
                where={"id": existing_lock.id},
                data={"lastActivity": datetime.utcnow()}
            )
            return LockResponse(
                status="extended",
                message="Lock extended",
                lock=_format_lock(updated)
            )
        else:
            raise LockConflictError(
                f"Pericope is being analyzed by {existing_lock.userName}",
                existing_lock.userName,
                existing_lock.startedAt.isoformat()
            )
    
    lock = await db.pericopelock.create(
        data={
            "pericopeRef": reference,
            "userId": user_id,
            "userName": username,
            "startedAt": datetime.utcnow(),
            "lastActivity": datetime.utcnow(),
        }
    )
    
    return LockResponse(
        status="locked",
        message="Pericope locked successfully",
        lock=_format_lock(lock)
    )


async def unlock_pericope(db: Prisma, reference: str, user_id: str, user_role: Optional[str] = None) -> UnlockResponse:
    """
    Release a pericope lock.
    
    Args:
        reference: The pericope reference.
        user_id: The user's ID.
        user_role: The user's role (for admin check).
        
    Returns:
        An UnlockResponse with status and message.
        
    Raises:
        NotAuthorizedError: If not owner or admin.
    """
    
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if not existing_lock:
        return UnlockResponse(status="not_locked", message="Pericope was not locked")
    
    is_owner = existing_lock.userId == user_id
    is_admin = user_role == "admin"
    
    if not is_owner and not is_admin:
        raise NotAuthorizedError("Only the lock owner or an admin can release this lock")
    
    await db.pericopelock.delete(where={"id": existing_lock.id})
    
    return UnlockResponse(status="unlocked", message="Pericope unlocked successfully")


async def list_all_locks(db: Prisma) -> List[LockInfo]:
    """
    List all active pericope locks.
    
    Returns:
        A list of LockInfo objects.
    """
    
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


async def heartbeat_lock(db: Prisma, reference: str, user_id: str) -> HeartbeatResponse:
    """
    Update the lastActivity timestamp for a lock.
    
    Args:
        reference: The pericope reference.
        user_id: The user's ID.
        
    Returns:
        A HeartbeatResponse with status and last activity time.
        
    Raises:
        LockNotFoundError: If lock not found.
        NotAuthorizedError: If not the lock owner.
    """
    
    existing_lock = await db.pericopelock.find_unique(
        where={"pericopeRef": reference}
    )
    
    if not existing_lock:
        raise LockNotFoundError("Lock not found")
    
    if existing_lock.userId != user_id:
        raise NotAuthorizedError("Not your lock")
    
    updated = await db.pericopelock.update(
        where={"id": existing_lock.id},
        data={"lastActivity": datetime.utcnow()}
    )
    
    return HeartbeatResponse(status="ok", lastActivity=updated.lastActivity.isoformat())


async def reset_all_locks(db: Prisma) -> DeleteResponse:
    """
    Delete all pericope locks (admin operation).
    
    Returns:
        A DeleteResponse with deletion count.
    """
    result = await db.pericopelock.delete_many()
    return DeleteResponse(
        status="success",
        message="All locks have been reset",
        deleted_count=result
    )


async def delete_all_passages(db: Prisma) -> DeleteResponse:
    """
    Delete all passages and related data (admin operation).
    
    Returns:
        A DeleteResponse with deletion count.
    """
    
    await db.pericopelock.delete_many()
    passage_count = await db.passage.count()
    await db.passage.delete_many()
    
    return DeleteResponse(
        status="success",
        message="All passages and related data have been deleted",
        deleted_count=passage_count
    )


async def reset_everything(db: Prisma) -> ResetResponse:
    """
    Complete system reset - deletes ALL data (admin operation).
    
    Returns:
        A ResetResponse with all deletion counts.
    """
    
    deleted_counts = {}
    deleted_counts["locks"] = await db.pericopelock.delete_many()
    deleted_counts["edit_logs"] = await db.editlog.delete_many()
    deleted_counts["snapshots"] = await db.aisnapshot.delete_many()
    deleted_counts["metrics"] = await db.metricssummary.delete_many()
    deleted_counts["passages"] = await db.passage.delete_many()
    
    return ResetResponse(
        status="success",
        message="Complete system reset performed. All data has been deleted.",
        deleted_counts=deleted_counts
    )


def _format_lock(lock: Any) -> LockInfo:
    """
    Format a lock object for response.
    
    Args:
        lock: The lock database object.
        
    Returns:
        A LockInfo object.
    """
    return LockInfo(
        pericopeRef=lock.pericopeRef,
        userId=lock.userId,
        userName=lock.userName,
        startedAt=lock.startedAt.isoformat(),
        lastActivity=lock.lastActivity.isoformat(),
    )
