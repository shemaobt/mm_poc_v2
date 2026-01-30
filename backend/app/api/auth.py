from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import List
from prisma import Prisma

from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.services import auth_service
from app.services.auth_service import (
    UsernameExistsError,
    EmailExistsError,
    InvalidCredentialsError,
    UserNotFoundError
)

router = APIRouter()


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    roles: List[str]
    isApproved: bool
    createdAt: str


@router.post("/signup", response_model=UserResponse)
async def signup(request: SignupRequest, db: Prisma = Depends(get_db)):
    """Register a new user account."""
    try:
        user = await auth_service.signup(
            db,
            username=request.username,
            email=request.email,
            password=request.password
        )
    except UsernameExistsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except EmailExistsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=user.roles,
        isApproved=user.isApproved,
        createdAt=user.createdAt.isoformat()
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Prisma = Depends(get_db)):
    """Login and receive access token."""
    try:
        access_token = await auth_service.login(
            db,
            username=request.username,
            password=request.password
        )
    except InvalidCredentialsError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(db: Prisma = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    try:
        user = await auth_service.get_user_by_id(db, current_user["sub"])
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=user.roles,
        isApproved=user.isApproved,
        createdAt=user.createdAt.isoformat()
    )
