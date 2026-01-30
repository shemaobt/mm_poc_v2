import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from prisma import Prisma
from pydantic import BaseModel

from app.core.database import get_db
from app.services import ai_prefill_service, ai_streaming_service
from app.services.ai_prefill_service import (
    APIKeyNotConfiguredError,
    PassageNotFoundError,
    InvalidReferenceError
)
from app.services.ai_streaming_service import NoParticipantsError

router = APIRouter()


class AIPrefillRequest(BaseModel):
    passage_ref: str


class AIAnalysisRequest(BaseModel):
    reference: str


@router.post("/prefill")
async def ai_prefill(request: AIPrefillRequest, db: Prisma = Depends(get_db)):
    """AI prefill all fields for a passage."""
    try:
        return await ai_prefill_service.prefill_passage(db, passage_ref=request.passage_ref)
    except APIKeyNotConfiguredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidReferenceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"AI prefill error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/stream")
async def analyze_full_stream(passage_ref: str, db: Prisma = Depends(get_db)):
    """Full AI Analysis with SSE streaming for all steps."""
    async def event_generator():
        async for progress in ai_streaming_service.run_full_analysis_stream(db, passage_ref):
            yield f"data: {json.dumps(progress)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/analyze/phase1")
async def analyze_phase1(request: AIPrefillRequest, db: Prisma = Depends(get_db)):
    """Phase 1: Participants and Relations analysis."""
    try:
        return await ai_streaming_service.run_phase1(
            db, passage_ref=request.passage_ref
        )
    except ai_streaming_service.APIKeyNotConfiguredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ai_streaming_service.PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Phase 1 Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/phase2")
async def analyze_phase2(request: AIPrefillRequest, db: Prisma = Depends(get_db)):
    """Phase 2: Events and Discourse analysis (requires Phase 1 data)."""
    try:
        return await ai_streaming_service.run_phase2(
            db, passage_ref=request.passage_ref
        )
    except ai_streaming_service.PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NoParticipantsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Phase 2 Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/phase2/stream")
async def analyze_phase2_stream(passage_ref: str, db: Prisma = Depends(get_db)):
    """Phase 2 with SSE streaming for real-time progress updates."""
    async def event_generator():
        async for progress in ai_streaming_service.run_phase2_stream(db, passage_ref):
            yield f"data: {json.dumps(progress)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/translate_clauses")
async def translate_clauses_endpoint(request: AIAnalysisRequest, db: Prisma = Depends(get_db)):
    """Generate free translations for all clauses in a passage."""
    try:
        return await ai_prefill_service.translate_clauses(db, request.reference)
    except PassageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except APIKeyNotConfiguredError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_ai_models():
    """List available AI models."""
    return ai_prefill_service.list_ai_models()
