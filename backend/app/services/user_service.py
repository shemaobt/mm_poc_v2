from typing import List, Dict, Any

from prisma import Prisma


VALID_ROLES = ["user", "admin", "validator", "mentor", "community", "builder"]


class UserNotFoundError(Exception):
    """Raised when a user cannot be found."""
    pass


class SelfOperationError(Exception):
    """Raised when a user attempts an invalid operation on themselves."""
    pass


class InvalidRoleError(Exception):
    """Raised when an invalid role is specified."""
    pass


async def list_users(db: Prisma) -> List[Any]:
    """
    List all users ordered by creation date.
    
    Args:
        db: The Prisma database client.
        
    Returns:
        A list of all users.
    """
    return await db.user.find_many(order={"createdAt": "desc"})


async def approve_user(db: Prisma, user_id: str) -> Dict[str, Any]:
    """
    Approve a user account.
    
    Args:
        db: The Prisma database client.
        user_id: The ID of the user to approve.
        
    Returns:
        A confirmation message.
        
    Raises:
        UserNotFoundError: If the user does not exist.
    """
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise UserNotFoundError("User not found")
    
    await db.user.update(
        where={"id": user_id},
        data={"isApproved": True}
    )
    
    return {"message": "User approved", "user_id": user_id}


async def reject_user(db: Prisma, user_id: str, admin_id: str) -> Dict[str, Any]:
    """
    Reject (unapprove) a user account.
    
    Args:
        db: The Prisma database client.
        user_id: The ID of the user to reject.
        admin_id: The ID of the admin performing the action.
        
    Returns:
        A confirmation message.
        
    Raises:
        UserNotFoundError: If the user does not exist.
        SelfOperationError: If an admin tries to reject themselves.
    """
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise UserNotFoundError("User not found")
    
    if user_id == admin_id:
        raise SelfOperationError("Cannot reject yourself")
    
    await db.user.update(
        where={"id": user_id},
        data={"isApproved": False}
    )
    
    return {"message": "User rejected", "user_id": user_id}


async def update_roles(db: Prisma, user_id: str, roles: List[str], admin_id: str) -> Dict[str, Any]:
    """
    Update the roles for a user.
    
    Args:
        db: The Prisma database client.
        user_id: The ID of the user to update.
        roles: The new list of roles.
        admin_id: The ID of the admin performing the action.
        
    Returns:
        A confirmation message.
        
    Raises:
        InvalidRoleError: If any role is not in VALID_ROLES.
        UserNotFoundError: If the user does not exist.
        SelfOperationError: If an admin tries to remove admin role from themselves.
    """
    for r in roles:
        if r not in VALID_ROLES:
            raise InvalidRoleError(f"Invalid role: {r}. Must be one of {VALID_ROLES}")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise UserNotFoundError("User not found")
    
    if user_id == admin_id and "admin" not in roles:
        raise SelfOperationError("Cannot remove admin role from yourself")
    
    await db.user.update(
        where={"id": user_id},
        data={"roles": roles}
    )
    
    return {"message": f"User roles updated to {roles}", "user_id": user_id}


async def delete_user(db: Prisma, user_id: str, admin_id: str) -> Dict[str, Any]:
    """
    Delete a user account.
    
    Args:
        db: The Prisma database client.
        user_id: The ID of the user to delete.
        admin_id: The ID of the admin performing the action.
        
    Returns:
        A confirmation message.
        
    Raises:
        UserNotFoundError: If the user does not exist.
        SelfOperationError: If an admin tries to delete themselves.
    """
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise UserNotFoundError("User not found")
    
    if user_id == admin_id:
        raise SelfOperationError("Cannot delete yourself")
    
    await db.user.delete(where={"id": user_id})
    
    return {"message": "User deleted", "user_id": user_id}


async def get_user_progress(db: Prisma) -> List[Dict[str, Any]]:
    """
    Get progress information for all approved users.
    
    Args:
        db: The Prisma database client.
        
    Returns:
        A list of user progress records including completed/in-progress passages and locks.
    """
    users = await db.user.find_many(
        where={"isApproved": True},
        order={"username": "asc"}
    )
    
    result = []
    for user in users:
        completed_count = await db.passage.count(
            where={
                "userId": user.id,
                "isComplete": True
            }
        )
        
        in_progress_count = await db.passage.count(
            where={
                "userId": user.id,
                "isComplete": False
            }
        )
        
        locks = await db.pericopelock.find_many(
            where={"userId": user.id},
            order={"startedAt": "desc"}
        )
        
        lock_info = [
            {
                "pericopeRef": lock.pericopeRef,
                "startedAt": lock.startedAt.isoformat(),
                "lastActivity": lock.lastActivity.isoformat(),
            }
            for lock in locks
        ]
        
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "roles": user.roles,
            "completedPassages": completed_count,
            "inProgressPassages": in_progress_count,
            "currentLocks": lock_info,
        })
    
    return result
