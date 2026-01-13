#!/usr/bin/env python3
"""
Migration script to import Old Testament pericopes from the mm database
into the mm_poc_v2 database.

Run this script ONCE after updating the Prisma schema.
"""

import asyncio
import psycopg2
from prisma import Prisma

# Source database (mm project)
SOURCE_DB_URL = "postgresql://neondb_owner:npg_3YFfDNHjq0nM@ep-tiny-wave-a4fo12gh-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Old Testament books (in order)
OLD_TESTAMENT_BOOKS = [
    "Genesis",
    "Exodus", 
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Song of Songs",  # Alternative name
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
]


async def import_pericopes():
    """Import Old Testament pericopes from source database."""
    print("=" * 60)
    print("PERICOPE MIGRATION - Old Testament Only")
    print("=" * 60)
    
    # Connect to source database
    print("\n📖 Connecting to source database (mm)...")
    try:
        source_conn = psycopg2.connect(SOURCE_DB_URL)
        source_cursor = source_conn.cursor()
        print("  ✓ Connected to source database")
    except Exception as e:
        print(f"  ❌ Failed to connect to source database: {e}")
        return
    
    # Query all pericopes from source
    print("\n📥 Reading pericopes from source...")
    source_cursor.execute("""
        SELECT reference, book, chapter_start, verse_start, chapter_end, verse_end
        FROM pericopes
        ORDER BY id
    """)
    all_pericopes = source_cursor.fetchall()
    print(f"  Total pericopes in source: {len(all_pericopes)}")
    
    # Filter for Old Testament only
    ot_pericopes = []
    for row in all_pericopes:
        reference, book, chapter_start, verse_start, chapter_end, verse_end = row
        if book in OLD_TESTAMENT_BOOKS:
            ot_pericopes.append({
                "reference": reference,
                "book": book,
                "chapterStart": chapter_start,
                "verseStart": verse_start,
                "chapterEnd": chapter_end,
                "verseEnd": verse_end,
            })
    
    print(f"  Old Testament pericopes: {len(ot_pericopes)}")
    
    # Group by book for summary
    book_counts = {}
    for p in ot_pericopes:
        book_counts[p["book"]] = book_counts.get(p["book"], 0) + 1
    
    print("\n📊 Pericopes by book:")
    for book in OLD_TESTAMENT_BOOKS:
        if book in book_counts:
            print(f"  {book}: {book_counts[book]}")
    
    source_conn.close()
    
    # Connect to target database
    print("\n📤 Connecting to target database (mm_poc_v2)...")
    db = Prisma()
    await db.connect()
    print("  ✓ Connected to target database")
    
    # Check existing pericopes
    existing_count = await db.pericope.count()
    print(f"  Existing pericopes in target: {existing_count}")
    
    if existing_count > 0:
        print("\n⚠️  Target database already has pericopes. Skipping import.")
        print(f"  Existing count: {existing_count}")
        await db.disconnect()
        return
    
    # Import pericopes
    print(f"\n🔨 Importing {len(ot_pericopes)} pericopes...")
    
    created = 0
    errors = []
    
    for p in ot_pericopes:
        try:
            await db.pericope.create(data=p)
            created += 1
            if created % 100 == 0:
                print(f"  ✓ Created {created}/{len(ot_pericopes)}...")
        except Exception as e:
            errors.append((p["reference"], str(e)))
    
    print(f"\n✅ IMPORT COMPLETE")
    print(f"  Successfully created: {created} pericopes")
    
    if errors:
        print(f"  ❌ Errors: {len(errors)}")
        for ref, error in errors[:5]:
            print(f"    - {ref}: {error}")
    
    # Final count
    final_count = await db.pericope.count()
    print(f"\n  Total pericopes in target database: {final_count}")
    
    await db.disconnect()
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(import_pericopes())

