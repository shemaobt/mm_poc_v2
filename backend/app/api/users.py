"""
Users API Router
Admin-only user management endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.core.auth_middleware import get_admin_user

router = APIRouter()


class UserListItem(BaseModel):
    id: str
    username: str
    email: str
    roles: List[str]
    isApproved: bool
    createdAt: str


class UsersListResponse(BaseModel):
    users: List[UserListItem]


class RolesUpdateRequest(BaseModel):
    roles: List[str]


@router.get("", response_model=UsersListResponse)
async def list_users(admin: dict = Depends(get_admin_user)):
    """List all users (admin only)"""
    db = get_db()
    
    users = await db.user.find_many(
        order={"createdAt": "desc"}
    )
    
    return UsersListResponse(
        users=[
            UserListItem(
                id=u.id,
                username=u.username,
                email=u.email,
                roles=u.roles,
                isApproved=u.isApproved,
                createdAt=u.createdAt.isoformat()
            )
            for u in users
        ]
    )


@router.put("/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a pending user (admin only)"""
    db = get_db()
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated = await db.user.update(
        where={"id": user_id},
        data={"isApproved": True}
    )
    
    return {"message": "User approved", "user_id": user_id}


@router.put("/{user_id}/reject")
async def reject_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Reject/unapprove a user (admin only)"""
    db = get_db()
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow rejecting yourself
    if user_id == admin["sub"]:
        raise HTTPException(status_code=400, detail="Cannot reject yourself")
    
    updated = await db.user.update(
        where={"id": user_id},
        data={"isApproved": False}
    )
    
    return {"message": "User rejected", "user_id": user_id}


@router.put("/{user_id}/role")
async def update_user_roles(
    user_id: str,
    request: RolesUpdateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Update user roles (admin only)"""
    db = get_db()
    
    valid_roles = ["user", "admin", "validator", "mentor", "community", "builder"]
    for r in request.roles:
        if r not in valid_roles:
             raise HTTPException(status_code=400, detail=f"Invalid role: {r}. Must be one of {valid_roles}")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow removing admin from yourself if you are the user being updated
    if user_id == admin["sub"] and "admin" not in request.roles:
        raise HTTPException(status_code=400, detail="Cannot remove admin role from yourself")
    
    updated = await db.user.update(
        where={"id": user_id},
        data={"roles": request.roles}
    )
    
    return {"message": f"User roles updated to {request.roles}", "user_id": user_id}


@router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user (admin only)"""
    db = get_db()
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting yourself
    if user_id == admin["sub"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    await db.user.delete(where={"id": user_id})
    
    return {"message": "User deleted", "user_id": user_id}


# ============================================================
# USER PROGRESS (Admin Dashboard)
# ============================================================

class PericopeLockInfo(BaseModel):
    pericopeRef: str
    startedAt: str
    lastActivity: str


class UserProgressItem(BaseModel):
    id: str
    username: str
    email: str
    roles: List[str]
    completedPassages: int
    inProgressPassages: int
    currentLocks: List[PericopeLockInfo]


class UserProgressResponse(BaseModel):
    users: List[UserProgressItem]


@router.get("/progress", response_model=UserProgressResponse)
async def get_user_progress(admin: dict = Depends(get_admin_user)):
    """
    Get progress information for all users (admin only).
    Shows completed passages, in-progress work, and current locks.
    """
    db = get_db()
    
    # Get all approved users
    users = await db.user.find_many(
        where={"isApproved": True},
        order={"username": "asc"}
    )
    
    result = []
    for user in users:
        # Count completed passages for this user
        completed_count = await db.passage.count(
            where={
                "userId": user.id,
                "isComplete": True
            }
        )
        
        # Count in-progress passages for this user
        in_progress_count = await db.passage.count(
            where={
                "userId": user.id,
                "isComplete": False
            }
        )
        
        # Get current locks for this user
        locks = await db.pericopelock.find_many(
            where={"userId": user.id},
            order={"startedAt": "desc"}
        )
        
        lock_info = [
            PericopeLockInfo(
                pericopeRef=lock.pericopeRef,
                startedAt=lock.startedAt.isoformat(),
                lastActivity=lock.lastActivity.isoformat(),
            )
            for lock in locks
        ]
        
        result.append(UserProgressItem(
            id=user.id,
            username=user.username,
            email=user.email,
            roles=user.roles,
            completedPassages=completed_count,
            inProgressPassages=in_progress_count,
            currentLocks=lock_info,
        ))
    
    return UserProgressResponse(users=result)
