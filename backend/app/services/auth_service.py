from typing import Any
from datetime import timedelta

from prisma import Prisma
from app.core.auth_middleware import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)


class UsernameExistsError(Exception):
    """Raised when attempting to register with an existing username."""
    pass


class EmailExistsError(Exception):
    """Raised when attempting to register with an existing email."""
    pass


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""
    pass


class UserNotFoundError(Exception):
    """Raised when a user cannot be found."""
    pass


async def signup(db: Prisma, username: str, email: str, password: str) -> Any:
    """
    Register a new user account.
    
    Args:
        username: The desired username.
        email: The user's email address.
        password: The plain text password to hash.
        
    Returns:
        The created user record.
        
    Raises:
        UsernameExistsError: If the username is already taken.
        EmailExistsError: If the email is already registered.
    """
    
    existing_user = await db.user.find_first(
        where={
            "OR": [
                {"username": username},
                {"email": email}
            ]
        }
    )
    
    if existing_user:
        if existing_user.username == username:
            raise UsernameExistsError("Username already taken")
        else:
            raise EmailExistsError("Email already registered")
    
    password_hash = get_password_hash(password)
    
    user = await db.user.create(
        data={
            "username": username,
            "email": email,
            "passwordHash": password_hash,
            "roles": ["user"],
            "isApproved": False
        }
    )
    
    return user


async def login(db: Prisma, username: str, password: str) -> str:
    """
    Authenticate a user and generate an access token.
    
    Args:
        username: The username to authenticate.
        password: The plain text password to verify.
        
    Returns:
        A JWT access token string.
        
    Raises:
        InvalidCredentialsError: If username or password is incorrect.
    """
    
    user = await db.user.find_unique(where={"username": username})
    
    if not user:
        raise InvalidCredentialsError("Invalid username or password")
    
    if not verify_password(password, user.passwordHash):
        raise InvalidCredentialsError("Invalid username or password")
    
    token_data = {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "roles": user.roles,
        "is_approved": user.isApproved
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return access_token


async def get_user_by_id(db: Prisma, user_id: str) -> Any:
    """
    Retrieve a user by their ID.
    
    Args:
        user_id: The ID of the user to retrieve.
        
    Returns:
        The user record.
        
    Raises:
        UserNotFoundError: If no user exists with the given ID.
    """
    
    user = await db.user.find_unique(where={"id": user_id})
    
    if not user:
        raise UserNotFoundError("User not found")
    
    return user
