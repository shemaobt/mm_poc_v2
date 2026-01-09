"""
BHSA API Router
Endpoints for loading and fetching BHSA data
"""
import os
import shutil
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel

from app.services.bhsa_service import get_bhsa_service, parse_reference

router = APIRouter()


class PassageRequest(BaseModel):
    """Request model for fetching passage"""
    ref: str  # e.g., "Ruth 1:1-6"


@router.get("/status")
async def get_bhsa_status():
    """Check BHSA loading status"""
    bhsa_service = get_bhsa_service()
    return {
        "status": "loaded" if bhsa_service.is_loaded() else "not_loaded",
        "bhsa_loaded": bhsa_service.is_loaded(),
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
async def fetch_passage(ref: str):
    """
    Fetch passage data from BHSA
    
    Args:
        ref: Biblical reference, e.g., "Ruth 1:1-6"
    """
    bhsa_service = get_bhsa_service()
    
    if not bhsa_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="BHSA not loaded. Please call /api/bhsa/load first"
        )
    
    try:
        # Parse reference
        book, chapter, start_verse, end_verse = parse_reference(ref)
        
        # Extract passage
        passage_data = bhsa_service.extract_passage(
            book, chapter, start_verse, end_verse
        )
        
        return passage_data
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
