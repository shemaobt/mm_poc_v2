"""
Options API Router
Endpoints for managing dynamic field options
"""
from typing import List
from fastapi import APIRouter, HTTPException, Path, Depends

from app.models.schemas import FieldOptionCreate, FieldOptionResponse
from app.services import option_service
from app.core.auth_middleware import get_current_user

router = APIRouter(prefix="/options", tags=["options"])


@router.get("/categories", response_model=List[str])
async def list_categories():
    """List all available option categories"""
    try:
        return await option_service.get_all_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category}", response_model=List[FieldOptionResponse])
async def list_options(category: str = Path(..., description="The option category")):
    """
    List all options for a given category.
    
    Categories include:
    - participant_type, quantity, reference_status
    - relation_category
    - event_category, semantic_role
    - modifier_happened, modifier_realness, modifier_when, etc.
    - discourse_relation, discourse_function, narrative_function
    - emotion_primary, emotion_intensity, emotion_source
    - And many more...
    """
    try:
        options = await option_service.get_by_category(category)
        return options
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{category}", response_model=FieldOptionResponse)
async def create_option(
    data: FieldOptionCreate,
    category: str = Path(..., description="The option category"),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new option for a category.
    
    Requires authentication. The option will be marked as user-created
    (not a default option) and will be available to all users.
    
    If an option with the same value already exists in the category,
    a 409 Conflict error is returned.
    """
    try:
        # Check if option already exists
        if await option_service.exists(category, data.value):
            raise HTTPException(
                status_code=409, 
                detail=f"Option '{data.value}' already exists in category '{category}'"
            )
        
        option = await option_service.create(
            category=category,
            value=data.value,
            label=data.label,
            user_id=current_user.get("sub")  # User ID from JWT
        )
        return option
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{category}/{option_id}")
async def delete_option(
    category: str = Path(...),
    option_id: str = Path(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a user-created option.
    
    Default (seeded) options cannot be deleted.
    Requires authentication.
    """
    try:
        deleted = await option_service.delete(option_id)
        if not deleted:
            raise HTTPException(
                status_code=404, 
                detail="Option not found or cannot be deleted (default options cannot be deleted)"
            )
        return {"status": "success", "id": option_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
