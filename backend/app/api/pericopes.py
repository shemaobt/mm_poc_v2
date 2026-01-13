"""
Pericopes API - List and search available pericopes
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from prisma import Prisma

router = APIRouter(prefix="/api/pericopes", tags=["pericopes"])


class PericopeResponse(BaseModel):
    id: str
    reference: str
    book: str
    chapterStart: int
    verseStart: int
    chapterEnd: Optional[int]
    verseEnd: Optional[int]


@router.get("", response_model=List[PericopeResponse])
async def list_pericopes(
    book: Optional[str] = Query(None, description="Filter by book name"),
    search: Optional[str] = Query(None, description="Search by reference"),
    limit: int = Query(100, le=500, description="Max results to return"),
):
    """
    List available pericopes with optional filtering.
    """
    db = Prisma()
    await db.connect()
    
    try:
        where = {}
        
        if book:
            where["book"] = book
        
        if search:
            where["reference"] = {"contains": search, "mode": "insensitive"}
        
        pericopes = await db.pericope.find_many(
            where=where,
            order={"reference": "asc"},
            take=limit,
        )
        
        return [
            PericopeResponse(
                id=p.id,
                reference=p.reference,
                book=p.book,
                chapterStart=p.chapterStart,
                verseStart=p.verseStart,
                chapterEnd=p.chapterEnd,
                verseEnd=p.verseEnd,
            )
            for p in pericopes
        ]
    finally:
        await db.disconnect()


@router.get("/books", response_model=List[str])
async def list_books():
    """
    List all unique book names that have pericopes.
    """
    db = Prisma()
    await db.connect()
    
    try:
        # Get distinct books
        pericopes = await db.pericope.find_many(
            distinct=["book"],
            order={"book": "asc"},
        )
        
        # Order by canonical order
        OT_ORDER = [
            "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
            "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
            "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
            "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
            "Ecclesiastes", "Song of Solomon", "Song of Songs",
            "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
            "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
            "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        ]
        
        books = [p.book for p in pericopes]
        # Sort by canonical order
        ordered_books = [b for b in OT_ORDER if b in books]
        # Add any books not in OT_ORDER at the end
        remaining = [b for b in books if b not in OT_ORDER]
        
        return ordered_books + remaining
    finally:
        await db.disconnect()

