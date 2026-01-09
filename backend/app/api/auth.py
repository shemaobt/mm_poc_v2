"""
Authentication API Router
Signup, login, and user info endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import timedelta

from app.core.database import get_db
from app.core.auth_middleware import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
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
    role: str
    isApproved: bool
    createdAt: str


@router.post("/signup", response_model=UserResponse)
async def signup(request: SignupRequest):
    """Register a new user account"""
    db = get_db()
    
    # Check if username or email already exists
    existing_user = await db.user.find_first(
        where={
            "OR": [
                {"username": request.username},
                {"email": request.email}
            ]
        }
    )
    
    if existing_user:
        if existing_user.username == request.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Hash password and create user
    password_hash = get_password_hash(request.password)
    
    user = await db.user.create(
        data={
            "username": request.username,
            "email": request.email,
            "passwordHash": password_hash,
            "role": "user",
            "isApproved": False
        }
    )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        isApproved=user.isApproved,
        createdAt=user.createdAt.isoformat()
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login and receive access token"""
    db = get_db()
    
    # Find user by username
    user = await db.user.find_unique(where={"username": request.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(request.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Create access token
    token_data = {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_approved": user.isApproved
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info"""
    db = get_db()
    
    user = await db.user.find_unique(where={"id": current_user["sub"]})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        isApproved=user.isApproved,
        createdAt=user.createdAt.isoformat()
    )
