from typing import List, Any, Dict, Optional

from prisma import Json, Prisma

from app.services.bhsa_service import get_bhsa_service, parse_reference


class PassageNotFoundError(Exception):
    """Raised when a passage cannot be found."""
    pass


class BHSADataError(Exception):
    """Raised when BHSA data cannot be fetched."""
    pass


class NotAuthorizedError(Exception):
    """Raised when a user is not authorized for an operation."""
    pass


async def list_passages(db: Prisma) -> List[Any]:
    """
    List all passages ordered by creation date.
    
    Args:
        db: The Prisma database client.
        
    Returns:
        A list of all passages.
    """
    return await db.passage.find_many(order={"createdAt": "desc"})


async def get_passage(db: Prisma, passage_id: str) -> Any:
    """
    Get a passage by ID with its clauses.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        
    Returns:
        The passage with clauses included.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
    """
    passage = await db.passage.find_unique(
        where={"id": passage_id},
        include={"clauses": True}
    )
    if not passage:
        raise PassageNotFoundError("Passage not found")
    return passage


async def create_passage(
    db: Prisma,
    reference: str,
    source_lang: str,
    user_id: str
) -> Any:
    """
    Create a new passage from a reference, fetching BHSA data.
    
    Args:
        db: The Prisma database client.
        reference: The passage reference (e.g., "Ruth 1:1-6").
        source_lang: The source language code.
        user_id: The ID of the user creating the passage.
        
    Returns:
        The created or existing passage.
        
    Raises:
        BHSADataError: If BHSA data cannot be fetched.
    """
    bhsa = get_bhsa_service()
    
    existing = await db.passage.find_unique(where={"reference": reference})
    
    if existing:
        return existing
        
    try:
        book, chapter, start_verse, end_verse = parse_reference(reference)
        data = bhsa.extract_passage(book, chapter, start_verse, end_verse)
    except Exception as e:
        raise BHSADataError(f"Failed to fetch BHSA data: {str(e)}")

    new_passage = await db.passage.create(data={
        "reference": reference,
        "sourceLang": source_lang,
        "isComplete": False,
        "userId": user_id
    })
    
    if "clauses" in data:
        await _create_clauses(db, new_passage.id, data["clauses"])
        
    return new_passage


async def delete_passage(
    db: Prisma,
    passage_id: str,
    user_id: str,
    user_roles: List[str]
) -> Dict[str, Any]:
    """
    Delete a passage if the user is authorized.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage to delete.
        user_id: The ID of the user requesting deletion.
        user_roles: The roles of the user.
        
    Returns:
        A confirmation message with the deleted passage ID.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
        NotAuthorizedError: If the user is not the owner or an admin.
    """
    passage = await db.passage.find_unique(where={"id": passage_id})
    
    if not passage:
        raise PassageNotFoundError("Passage not found")
    
    is_owner = passage.userId == user_id
    is_admin = "admin" in user_roles
    
    if not is_owner and not is_admin:
        raise NotAuthorizedError("Not authorized to delete this passage")
    
    await db.passage.delete(where={"id": passage_id})
    
    return {"message": "Passage deleted", "id": passage_id}


async def _create_clauses(db: Prisma, passage_id: str, clauses: List[Dict[str, Any]]) -> None:
    
    for idx, c in enumerate(clauses):
        subjects = c.get("subjects") or []
        objects = c.get("objects") or []
        names = c.get("names") or []
        
        clause_create_data = {
            "passage": {"connect": {"id": passage_id}},
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
            "subjects": Json(subjects),
            "objects": Json(objects),
            "names": Json(names),
        }
        
        await db.clause.create(data=clause_create_data)
