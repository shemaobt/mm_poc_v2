"""
BHSA API Router
Endpoints for loading and fetching BHSA data
"""
import os
import shutil
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Depends
from pydantic import BaseModel

from app.services.bhsa_service import get_bhsa_service, parse_reference
from app.core.database import get_db

router = APIRouter()


class PassageRequest(BaseModel):
    """Request model for fetching passage"""
    ref: str  # e.g., "Ruth 1:1-6"


@router.get("/status")
async def get_bhsa_status():
    """Check BHSA loading status"""
    bhsa_service = get_bhsa_service()
    
    is_loaded = bhsa_service.is_loaded()
    
    # Return 503 Service Unavailable if not loaded
    # This allows Cloud Run startup probes to wait until data is ready
    if not is_loaded:
        from fastapi import Response
        return Response(
            content='{"status": "not_loaded", "bhsa_loaded": false, "message": "' + bhsa_service.get_loading_message() + '"}',
            status_code=503,
            media_type="application/json"
        )
        
    return {
        "status": "loaded",
        "bhsa_loaded": True,
        "message": bhsa_service.get_loading_message()
    }


@router.post("/load")
async def load_bhsa_data(background_tasks: BackgroundTasks):
    """Start loading BHSA data in background"""
    bhsa_service = get_bhsa_service()
    
    if bhsa_service.is_loaded():
        return {
            "status": "already_loaded",
            "message": "BHSA data is already loaded"
        }
    
    # Run load_bhsa in background task (which will run in threadpool since it's sync)
    background_tasks.add_task(bhsa_service.load_bhsa)
    
    return {
        "status": "loading_started",
        "message": "BHSA data loading started in background"
    }


@router.post("/upload")
async def upload_bhsa_data(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload parsed BHSA data (zip file).
    This assumes the zip contains the 'text-fabric-data' folder structure or is the 'text-fabric-data' folder itself.
    Legacy/Manual upload for cloud environments.
    """
    bhsa_service = get_bhsa_service()
    
    # Define text-fabric-data directory (standard location)
    tf_data_dir = Path(os.path.expanduser("~/text-fabric-data"))
    
    # Ensure directory exists
    tf_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Save uploaded file temporarily
    temp_zip_path = tf_data_dir / "temp_upload.zip"
    
    try:
        # Write uploaded contents to temp file
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Unzip
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(tf_data_dir)
            
        # Clean up zip
        os.remove(temp_zip_path)
        
        # Reload service if requested or just ensure it's fresh
        # We can trigger a load in background if not loaded
        if not bhsa_service.is_loaded():
            if background_tasks:
                background_tasks.add_task(bhsa_service.load_bhsa, force_reload=True)
            else:
                # If no background task allowed, just mark it ready to be loaded
                pass
                
        return {
            "status": "uploaded",
            "message": f"Data uploaded and extracted to {tf_data_dir}",
            "next_step": "Call /api/bhsa/load to load into memory"
        }
        
    except Exception as e:
        # Cleanup on failure
        if temp_zip_path.exists():
            os.remove(temp_zip_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload data: {str(e)}")


@router.get("/passage")
async def fetch_passage(ref: str, skip_translate: bool = False, db = Depends(get_db)):
    """
    Fetch passage data from BHSA and sync with DB for translations.
    Triggers AI translation if not present in DB (unless skip_translate=true).
    
    Args:
        ref: Biblical reference, e.g., "Ruth 1:1-6"
        skip_translate: If true, skip auto-translation (useful for preview)
    """
    bhsa_service = get_bhsa_service()
    
    if not bhsa_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="BHSA not loaded. Please call /api/bhsa/load first"
        )
    
    try:
        # 1. Parse reference
        book, chapter, start_verse, end_verse = parse_reference(ref)
        
        # 2. Extract passage from TF (Source of Truth for Structure)
        passage_data = bhsa_service.extract_passage(
            book, chapter, start_verse, end_verse
        )
        
        # 3. FAST DB SYNC
        # We need to ensure this passage exists in DB to store translations
        # Check if exists
        passage = await db.passage.find_unique(
            where={"reference": passage_data["reference"]},
            include={"clauses": True}
        )
        
        # If not, create it (lazy sync)
        if not passage:
            print(f"[Sync] Creating new passage in DB: {passage_data['reference']}")
            passage = await db.passage.create(
                data={
                    "reference": passage_data["reference"],
                }
            )
            
            # Create clauses
            clauses_to_create = []
            for i, c in enumerate(passage_data["clauses"]):
                clauses_to_create.append({
                    "passageId": passage.id,
                    "clauseIndex": i,
                    "verse": c["verse"],
                    "text": c["text"],
                    "gloss": c["gloss"],
                    "clauseType": c["clause_type"],
                })
            
            # Batch create clauses (Prisma python might not support create_many well, check)
            # Using loop for safety if create_many has issues in this version
            for c_data in clauses_to_create:
                 await db.clause.create(data=c_data)
                 
            # Re-fetch with clauses
            passage = await db.passage.find_unique(
                where={"id": passage.id},
                include={"clauses": True}
            )

        # 4. Check/Fetch Translations
        # Map existing translations: clauseIndex -> translation
        db_translations = {c.clauseIndex: c.freeTranslation for c in passage.clauses if c.freeTranslation}
        
        tf_clause_count = len(passage_data["clauses"])
        db_clause_count = len(passage.clauses)
        translated_count = len(db_translations)
        
        # Only translate if we have DB clauses that are missing translations
        # (not based on TF count which may differ)
        clauses_needing_translation = [c for c in passage.clauses if not c.freeTranslation]
        missing_count = len(clauses_needing_translation)
        
        # If we have missing translations, generate them automatically (One-time cost)
        # Skip if skip_translate=true (preview mode)
        if missing_count > 0 and not skip_translate:
            print(f"[Auto-Translate] {passage_data['reference']}: {missing_count}/{db_clause_count} clauses missing translations. Generating...")
            api_key = os.getenv("ANTHROPIC_API_KEY")
            
            if api_key:
                from app.services.ai_service import AIService
                try:
                    translations = await AIService.translate_clauses(passage_data, api_key)
                    
                    # Update DB
                    for cid_str, trans_text in translations.items():
                        try:
                            # Map 1-based AI ID to 0-based DB index
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
                    # Continue without translation, don't block
            else:
                print("[Auto-Translate] Skipped: No API Key")

        # 5. Merge Translations into Response
        # We inject 'freeTranslation' into the TF-data structure for the frontend
        for i, c in enumerate(passage_data["clauses"]):
            if i in db_translations:
                c["freeTranslation"] = db_translations[i]
        
        # 6. Include passage ID in response so frontend doesn't need to create again
        passage_data["id"] = passage.id
        passage_data["passage_id"] = passage.id  # Alias for clarity
        
        return passage_data
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
