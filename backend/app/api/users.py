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
    role: str
    isApproved: bool
    createdAt: str


class UsersListResponse(BaseModel):
    users: List[UserListItem]


class RoleUpdateRequest(BaseModel):
    role: str


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
                role=u.role,
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
async def update_user_role(
    user_id: str,
    request: RoleUpdateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Update user role (admin only)"""
    db = get_db()
    
    if request.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'admin'")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow demoting yourself
    if user_id == admin["sub"] and request.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    updated = await db.user.update(
        where={"id": user_id},
        data={"role": request.role}
    )
    
    return {"message": f"User role updated to {request.role}", "user_id": user_id}


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
