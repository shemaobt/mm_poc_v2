import os
import shutil
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional

from prisma import Json, Prisma

from app.core.config import get_settings
from app.services.bhsa_service import get_bhsa_service, parse_reference


class BHSANotLoadedError(Exception):
    """Raised when BHSA data is not loaded."""
    pass


class InvalidReferenceError(Exception):
    """Raised when a biblical reference cannot be parsed."""
    pass


def get_bhsa_status() -> Dict[str, Any]:
    """
    Get the current status of the BHSA service.
    
    Returns:
        A dictionary with status, bhsa_loaded, and message.
    """
    bhsa_service = get_bhsa_service()
    is_loaded = bhsa_service.is_loaded()
    
    return {
        "status": "loaded" if is_loaded else "not_loaded",
        "bhsa_loaded": is_loaded,
        "message": bhsa_service.get_loading_message()
    }


def start_bhsa_load() -> Dict[str, str]:
    """
    Start loading BHSA data.
    
    Returns:
        A dictionary with status and message.
    """
    bhsa_service = get_bhsa_service()
    
    if bhsa_service.is_loaded():
        return {
            "status": "already_loaded",
            "message": "BHSA data is already loaded"
        }
    
    return {
        "status": "loading_started",
        "message": "BHSA data loading started in background"
    }


def get_bhsa_load_task():
    """
    Get the BHSA load function for background execution.
    
    Returns:
        The load_bhsa method from the BHSA service.
    """
    return get_bhsa_service().load_bhsa


async def upload_bhsa_data(file_content, filename: str) -> Dict[str, str]:
    """
    Upload and extract BHSA data from a zip file.
    
    Args:
        file_content: The file-like object with zip content.
        filename: The original filename.
        
    Returns:
        A dictionary with status, message, and next_step.
    """
    tf_data_dir = Path(os.path.expanduser("~/text-fabric-data"))
    tf_data_dir.mkdir(parents=True, exist_ok=True)
    
    temp_zip_path = tf_data_dir / "temp_upload.zip"
    
    try:
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file_content, buffer)
            
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(tf_data_dir)
            
        os.remove(temp_zip_path)
        
        return {
            "status": "uploaded",
            "message": f"Data uploaded and extracted to {tf_data_dir}",
            "next_step": "Call /api/bhsa/load to load into memory"
        }
        
    except Exception as e:
        if temp_zip_path.exists():
            os.remove(temp_zip_path)
        raise e


async def fetch_passage_with_sync(
    db: Prisma,
    ref: str,
    skip_translate: bool = False,
    force_merge: bool = False
) -> Dict[str, Any]:
    """
    Fetch passage data from BHSA, sync with DB, and optionally translate.
    
    Args:
        db: Prisma database client.
        ref: Biblical reference, e.g., "Ruth 1:1-6".
        skip_translate: If true, skip auto-translation.
        force_merge: If true, re-run AI clause grouping.
        
    Returns:
        A dictionary with passage data including clauses and translations.
        
    Raises:
        BHSANotLoadedError: If BHSA is not loaded.
        InvalidReferenceError: If the reference cannot be parsed.
    """
    bhsa_service = get_bhsa_service()
    
    if not bhsa_service.is_loaded():
        raise BHSANotLoadedError("BHSA not loaded. Please call /api/bhsa/load first")
    
    try:
        book, chapter, start_verse, end_verse = parse_reference(ref)
    except ValueError as e:
        raise InvalidReferenceError(str(e))
    
    passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
    
    passage = await db.passage.find_unique(
        where={"reference": passage_data["reference"]},
        include={"clauses": True}
    )
    
    passage_data["display_units"] = await _get_display_units(
        passage, passage_data, skip_translate, force_merge
    )
    
    if not passage:
        passage = await _create_passage_with_clauses(db, passage_data)
    elif (not passage.displayUnits or force_merge) and passage_data.get("display_units"):
        await db.passage.update(
            where={"id": passage.id},
            data={"displayUnits": Json(passage_data["display_units"])}
        )
    
    db_translations = await _sync_translations(db, passage, passage_data, skip_translate)
    
    for i, c in enumerate(passage_data["clauses"]):
        if i in db_translations:
            c["freeTranslation"] = db_translations[i]
    
    passage_data["id"] = passage.id
    passage_data["passage_id"] = passage.id
    
    return passage_data


async def _get_display_units(
    passage: Optional[Any],
    passage_data: Dict[str, Any],
    skip_translate: bool,
    force_merge: bool
) -> List[Dict[str, Any]]:
    """
    Get or generate display units for clause grouping.
    """
    stored_display_units = None
    if passage and hasattr(passage, 'displayUnits') and passage.displayUnits:
        stored_display_units = passage.displayUnits

    if stored_display_units and not force_merge:
        return stored_display_units
    
    if not skip_translate and get_settings().anthropic_api_key:
        try:
            from app.services.ai_service import AIService
            return await AIService.suggest_clause_merges(passage_data)
        except Exception as e:
            print(f"[Merge] AI merge step failed: {e}, using one unit per clause.")
    
    return [{"clause_ids": [c["clause_id"]], "merged": False} for c in passage_data["clauses"]]


async def _create_passage_with_clauses(db: Prisma, passage_data: Dict[str, Any]) -> Any:
    """
    Create a new passage with its clauses in the database.
    """
    
    passage = await db.passage.create(
        data={
            "reference": passage_data["reference"],
            "displayUnits": Json(passage_data.get("display_units", [])),
        }
    )
    
    for i, c in enumerate(passage_data["clauses"]):
        await db.clause.create(data={
            "passageId": passage.id,
            "clauseIndex": i,
            "verse": c["verse"],
            "text": c["text"],
            "gloss": c["gloss"],
            "clauseType": c["clause_type"],
        })
    
    passage = await db.passage.find_unique(
        where={"id": passage.id},
        include={"clauses": True}
    )
    
    return passage


async def _sync_translations(
    db: Prisma,
    passage: Any,
    passage_data: Dict[str, Any],
    skip_translate: bool
) -> Dict[int, str]:
    """
    Sync translations from DB and generate missing ones if needed.
    """
    db_translations = {c.clauseIndex: c.freeTranslation for c in passage.clauses if c.freeTranslation}
    
    clauses_needing_translation = [c for c in passage.clauses if not c.freeTranslation]
    missing_count = len(clauses_needing_translation)
    
    if missing_count > 0 and not skip_translate:
        api_key = get_settings().anthropic_api_key
        
        if api_key:
            try:
                from app.services.ai_service import AIService
                translations = await AIService.translate_clauses(passage_data, api_key)
                
                for cid_str, trans_text in translations.items():
                    try:
                        idx = int(cid_str) - 1
                        if 0 <= idx < len(passage.clauses):
                            target_clause = next((c for c in passage.clauses if c.clauseIndex == idx), None)
                            if target_clause:
                                await db.clause.update(
                                    where={"id": target_clause.id},
                                    data={"freeTranslation": trans_text}
                                )
                                db_translations[idx] = trans_text
                    except ValueError:
                        pass
            except Exception as e:
                print(f"[Auto-Translate] Failed: {e}")
    
    return db_translations
