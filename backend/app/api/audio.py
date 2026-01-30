from fastapi import APIRouter, HTTPException

from app.services import audio_service
from app.services.audio_service import (
    RehearsalNotFoundError,
    RehearsalNoTextError,
    ElevenLabsConfigError,
    ElevenLabsAPIError
)

router = APIRouter()


@router.post("/generate/{rehearsal_id}")
async def generate_segmented_audio(rehearsal_id: str):
    """Generate audio for a rehearsal using ElevenLabs TTS."""
    try:
        result = await audio_service.generate_audio_for_rehearsal(rehearsal_id)
        return result
    except RehearsalNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RehearsalNoTextError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ElevenLabsConfigError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ElevenLabsAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
