from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Response
from prisma import Prisma
from pydantic import BaseModel

from app.core.database import get_db
from app.services import bhsa_sync_service
from app.services.bhsa_sync_service import (
    BHSANotLoadedError,
    InvalidReferenceError
)

router = APIRouter()


class PassageRequest(BaseModel):
    ref: str


@router.get("/status")
async def get_bhsa_status():
    """Check BHSA loading status."""
    status = bhsa_sync_service.get_bhsa_status()
    
    if not status["bhsa_loaded"]:
        return Response(
            content=f'{{"status": "not_loaded", "bhsa_loaded": false, "message": "{status["message"]}"}}',
            status_code=503,
            media_type="application/json"
        )
        
    return status


@router.post("/load")
async def load_bhsa_data(background_tasks: BackgroundTasks):
    """Start loading BHSA data in background."""
    status = bhsa_sync_service.start_bhsa_load()
    
    if status["status"] == "loading_started":
        background_tasks.add_task(bhsa_sync_service.get_bhsa_load_task())
    
    return status


@router.post("/upload")
async def upload_bhsa_data(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Upload parsed BHSA data (zip file)."""
    try:
        result = await bhsa_sync_service.upload_bhsa_data(file.file, file.filename)
        
        if result["status"] == "uploaded" and background_tasks:
            from app.services.bhsa_service import get_bhsa_service
            bhsa_service = get_bhsa_service()
            if not bhsa_service.is_loaded():
                background_tasks.add_task(bhsa_service.load_bhsa, force_reload=True)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload data: {str(e)}")


@router.get("/passage")
async def fetch_passage(
    ref: str,
    skip_translate: bool = False,
    force_merge: bool = False,
    db: Prisma = Depends(get_db)
):
    """
    Fetch passage data from BHSA and sync with DB for translations.
    """
    try:
        return await bhsa_sync_service.fetch_passage_with_sync(
            db=db,
            ref=ref,
            skip_translate=skip_translate,
            force_merge=force_merge
        )
    except BHSANotLoadedError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except InvalidReferenceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
