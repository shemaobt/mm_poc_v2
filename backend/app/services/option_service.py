"""
Option Service
Business logic for managing dynamic field options
"""
from typing import List, Optional
from app.core.database import db
from app.models.schemas import FieldOptionResponse, FieldOptionCreate


# ============================================================
# SERVICE FUNCTIONS (Async/IO)
# ============================================================

async def get_by_category(category: str) -> List[FieldOptionResponse]:
    """
    Get all options for a given category, ordered by sortOrder then createdAt.
    
    Args:
        category: The option category (e.g., "participant_type", "semantic_role")
        
    Returns:
        List of options for the category
    """
    options = await db.fieldoption.find_many(
        where={"category": category},
        order=[
            {"sortOrder": "asc"},
            {"createdAt": "asc"}
        ]
    )
    return [FieldOptionResponse.model_validate(opt.model_dump()) for opt in options]


async def get_all_categories() -> List[str]:
    """
    Get a list of all unique categories.
    
    Returns:
        List of category names
    """
    # Using raw query to get distinct categories
    options = await db.fieldoption.find_many(
        distinct=["category"],
        order={"category": "asc"}
    )
    return [opt.category for opt in options]


async def create(
    category: str,
    value: str,
    label: Optional[str] = None,
    user_id: Optional[str] = None
) -> FieldOptionResponse:
    """
    Create a new option for a category.
    
    Args:
        category: The option category
        value: The option value (stored in entities)
        label: Display label (defaults to value if not provided)
        user_id: ID of the user creating the option (None for system)
        
    Returns:
        The created option
        
    Raises:
        Exception if option already exists (unique constraint)
    """
    # Get the current max sortOrder for this category
    existing = await db.fieldoption.find_many(
        where={"category": category},
        order={"sortOrder": "desc"},
        take=1
    )
    next_sort_order = (existing[0].sortOrder + 1) if existing else 0
    
    option = await db.fieldoption.create(
        data={
            "category": category,
            "value": value,
            "label": label or value,
            "isDefault": False,
            "sortOrder": next_sort_order,
            "createdBy": user_id,
        }
    )
    return FieldOptionResponse.model_validate(option.model_dump())


async def exists(category: str, value: str) -> bool:
    """
    Check if an option exists for a category.
    
    Args:
        category: The option category
        value: The option value to check
        
    Returns:
        True if the option exists, False otherwise
    """
    option = await db.fieldoption.find_first(
        where={"category": category, "value": value}
    )
    return option is not None


async def delete(option_id: str) -> bool:
    """
    Delete an option by ID.
    Only non-default (user-created) options can be deleted.
    
    Args:
        option_id: The option ID
        
    Returns:
        True if deleted, False if not found or is a default option
    """
    option = await db.fieldoption.find_unique(where={"id": option_id})
    if not option:
        return False
    if option.isDefault:
        return False  # Cannot delete default options
    
    await db.fieldoption.delete(where={"id": option_id})
    return True
