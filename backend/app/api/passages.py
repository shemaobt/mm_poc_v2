"""
Passages API Router
CRUD operations for passages
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from prisma import Json

from app.core.database import get_db
from app.services.bhsa_service import get_bhsa_service, parse_reference

router = APIRouter()


class PassageCreate(BaseModel):
    """Model for creating/updating passage"""
    reference: str
    sourceLang: str = "hbo"
    peakEvent: Optional[str] = None
    thematicSpine: Optional[str] = None


@router.get("")
async def list_passages():
    """List all passages ordered by creation date"""
    db = get_db()
    # Return all passages, newest first
    passages = await db.passage.find_many(
        order={"createdAt": "desc"}
    )
    return passages


@router.get("/{passage_id}")
async def get_passage(passage_id: str):
    """Get passage by ID"""
    db = get_db()
    passage = await db.passage.find_unique(
        where={"id": passage_id},
        include={"clauses": True}
    )
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    return passage

@router.post("")
async def create_passage(passage: PassageCreate):
    """Create or update passage, ensuring clauses are populated"""
    db = get_db()
    bhsa = get_bhsa_service()
    
    # 1. Check if passage already exists
    existing = await db.passage.find_unique(where={"reference": passage.reference})
    
    if existing:
        # If exists, we might want to ensure clauses are there (idempotency)
        # For now, just return existing to avoid overhead
        return existing
        
    # 2. Parse reference to get details from BHSA
    try:
        book, chapter, start_verse, end_verse = parse_reference(passage.reference)
        # Extract full data including clauses
        data = bhsa.extract_passage(book, chapter, start_verse, end_verse)
    except Exception as e:
        # If BHSA fails (e.g. invalid ref or not loaded), we can't fully populate
        # But we might still want to create the shell? 
        # Better to fail if this is the primary way to init.
        raise HTTPException(status_code=400, detail=f"Failed to fetch BHSA data: {str(e)}")

    # 3. Create Passage
    new_passage = await db.passage.create(data={
        "reference": passage.reference,
        "sourceLang": passage.sourceLang,
        "isComplete": False
    })
    
    # 4. Create Clauses
    if "clauses" in data:
        # Prepare clause objects
        # We need to map BHSA clause dict to Prisma ClauseCreateInput
        # Note: Prisma create_many is not supported in client-py yet or might be?
        # client-py supports create_many since recent versions, let's try or loop.
        # Safe bet: Loop for now or create_many if confident.
        # BHSAservice returns a list of specific dicts. We need to map them.
        
        # Create clauses one by one with proper Prisma relation syntax
        for idx, c in enumerate(data["clauses"]):
            # Handle JSON fields: use None for empty lists (prisma-client-py handles None better)
            subjects = c.get("subjects") or []
            objects = c.get("objects") or []
            names = c.get("names") or []
            
            clause_create_data = {
                # Use relation connect syntax instead of direct passageId
                "passage": {"connect": {"id": new_passage.id}},
                "clauseIndex": idx,
                "verse": c["verse"],
                "text": c["text"],
                "gloss": c["gloss"],
                "clauseType": c["clause_type"],
                "isMainline": c["is_mainline"],
                "chainPosition": c.get("chain_position"),
                "lemma": c.get("lemma"),
                "lemmaAscii": c.get("lemma_ascii"),
                "binyan": c.get("binyan"),
                "tense": c.get("tense"),
                "hasKi": c.get("has_ki", False),
                # Always provide Json arrays, use empty array as fallback
                "subjects": Json(subjects),
                "objects": Json(objects),
                "names": Json(names),
            }
            
            try:
                await db.clause.create(data=clause_create_data)
            except Exception as e:
                print(f"Error creating clause {idx}: {e}")
                # If one fails, the passage is incomplete - rollback by raising
                raise e
        
    return new_passage


from app.core.auth_middleware import get_current_user_optional, get_current_approved_user

@router.delete("/{passage_id}")
async def delete_passage(
    passage_id: str,
    current_user: dict = Depends(get_current_approved_user)
):
    """Delete a passage (owner or admin only)"""
    db = get_db()
    
    # Find the passage
    passage = await db.passage.find_unique(where={"id": passage_id})
    
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    
    # Check authorization: must be owner or admin
    is_owner = passage.userId == current_user.get("sub")
    is_admin = current_user.get("role") == "admin"
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Not authorized to delete this passage"
        )
    
    # Delete the passage (cascades to related entities)
    await db.passage.delete(where={"id": passage_id})
    
    return {"message": "Passage deleted", "id": passage_id}
