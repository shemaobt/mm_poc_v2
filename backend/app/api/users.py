from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List
from prisma import Prisma

from app.core.auth_middleware import get_admin_user
from app.core.database import get_db
from app.services import user_service
from app.services.user_service import (
    UserNotFoundError,
    SelfOperationError,
    InvalidRoleError
)

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


@router.get("", response_model=UsersListResponse)
async def list_users(db: Prisma = Depends(get_db), admin: dict = Depends(get_admin_user)):
    users = await user_service.list_users(db)
    
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
async def approve_user(user_id: str, db: Prisma = Depends(get_db), admin: dict = Depends(get_admin_user)):
    try:
        return await user_service.approve_user(db, user_id)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{user_id}/reject")
async def reject_user(user_id: str, db: Prisma = Depends(get_db), admin: dict = Depends(get_admin_user)):
    try:
        return await user_service.reject_user(db, user_id, admin["sub"])
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SelfOperationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{user_id}/role")
async def update_user_roles(
    user_id: str,
    request: RolesUpdateRequest,
    db: Prisma = Depends(get_db),
    admin: dict = Depends(get_admin_user)
):
    try:
        return await user_service.update_roles(db, user_id, request.roles, admin["sub"])
    except InvalidRoleError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SelfOperationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(user_id: str, db: Prisma = Depends(get_db), admin: dict = Depends(get_admin_user)):
    try:
        return await user_service.delete_user(db, user_id, admin["sub"])
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SelfOperationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/progress", response_model=UserProgressResponse)
async def get_user_progress(db: Prisma = Depends(get_db), admin: dict = Depends(get_admin_user)):
    users = await user_service.get_user_progress(db)
    return UserProgressResponse(
        users=[UserProgressItem(**u) for u in users]
    )
