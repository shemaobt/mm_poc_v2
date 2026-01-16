from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import requests
import base64
from app.core.database import db as prisma
from typing import Optional, List

router = APIRouter()

class GenerateAudioRequest(BaseModel):
    pass

@router.post("/generate/{rehearsal_id}")
async def generate_segmented_audio(rehearsal_id: str):
    # 1. Fetch Rehearsal
    rehearsal = await prisma.rehearsal.find_unique(
        where={"id": rehearsal_id},
        include={"passage": True}
    )
    
    if not rehearsal:
        raise HTTPException(status_code=404, detail="Rehearsal not found")

    text = rehearsal.fullText
    if not text:
        raise HTTPException(status_code=400, detail="Rehearsal has no text")

    # 2. ElevenLabs Config
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        # Fallback or error?
        print("ELEVENLABS_API_KEY not set")
        raise HTTPException(status_code=500, detail="ElevenLabs API Key not configured on backend")

    voice_id = rehearsal.selectedVoiceId or "21m00Tcm4TlvDq8ikWAM" # Rachel default

    # 3. Call ElevenLabs
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "use_speaker_boost": True
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            print(f"ElevenLabs Error: {response.text}")
            raise HTTPException(status_code=502, detail=f"ElevenLabs API Error: {response.text}")
        
        audio_content = response.content
    except Exception as e:
        print(f"ElevenLabs Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # 4. Process encoding (Base64)
    # Since we don't have a storage bucket, we store as Data URI
    b64_audio = base64.b64encode(audio_content).decode('utf-8')
    data_uri = f"data:audio/mpeg;base64,{b64_audio}"

    # 5. Update Rehearsal in DB
    # We update fullAudioUrl AND segments (assuming 1 segment for full text for now, 
    # since splitting by sentence and generating per-segment is more complex and not shown in single call)
    # Actually, the user referenced mm_poc logic which splits into segments.
    # But generateFullAudio in mm_poc just makes one blob.
    # The frontend expects 'segments'. 
    
    # We will create ONE segment for the whole text for now to ensure playback works.
    
    new_segments = [
        {
            "id": "seg-1",
            "index": 0,
            "text": text,
            "audioUrl": data_uri,
            "duration": 0 # We don't know duration without analyzing audio
        }
    ]

    updated_rehearsal = await prisma.rehearsal.update(
        where={"id": rehearsal_id},
        data={
            "fullAudioUrl": data_uri,
            "segments": new_segments
        }
    )

    # 6. Return response
    return {
        "message": "Audio generated successfully",
        "rehearsalId": rehearsal_id,
        "audioUrl": data_uri,
        "segments": new_segments
    }
