import os
import base64
from typing import Dict, Any, List

import httpx
from prisma import Json

from app.core.database import db


class RehearsalNotFoundError(Exception):
    """Raised when a rehearsal cannot be found."""
    pass


class RehearsalNoTextError(Exception):
    """Raised when a rehearsal has no text to generate audio from."""
    pass


class ElevenLabsConfigError(Exception):
    """Raised when ElevenLabs API is not configured."""
    pass


class ElevenLabsAPIError(Exception):
    """Raised when ElevenLabs API returns an error."""
    
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


async def generate_audio_for_rehearsal(rehearsal_id: str) -> Dict[str, Any]:
    """
    Generate audio for a rehearsal using ElevenLabs TTS API.
    
    Args:
        rehearsal_id: The ID of the rehearsal to generate audio for.
        
    Returns:
        A dictionary with message, rehearsalId, audioUrl, and segments.
        
    Raises:
        RehearsalNotFoundError: If the rehearsal does not exist.
        RehearsalNoTextError: If the rehearsal has no text.
        ElevenLabsConfigError: If the API key is not configured.
        ElevenLabsAPIError: If the ElevenLabs API call fails.
    """
    rehearsal = await db.rehearsal.find_unique(
        where={"id": rehearsal_id},
        include={"passage": True}
    )
    
    if not rehearsal:
        raise RehearsalNotFoundError("Rehearsal not found")

    text = rehearsal.fullText
    if not text:
        raise RehearsalNoTextError("Rehearsal has no text")

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise ElevenLabsConfigError("ElevenLabs API Key not configured on backend")

    voice_id = rehearsal.selectedVoiceId or "21m00Tcm4TlvDq8ikWAM"
    
    audio_content = await _call_elevenlabs_tts(api_key, voice_id, text)
    
    b64_audio = base64.b64encode(audio_content).decode('utf-8')
    data_uri = f"data:audio/mpeg;base64,{b64_audio}"

    new_segments = _create_segments(text, data_uri)

    await db.rehearsal.update(
        where={"id": rehearsal_id},
        data={
            "fullAudioUrl": data_uri,
            "segments": Json(new_segments)
        }
    )

    return {
        "message": "Audio generated successfully",
        "rehearsalId": rehearsal_id,
        "audioUrl": data_uri,
        "segments": new_segments
    }


async def _call_elevenlabs_tts(api_key: str, voice_id: str, text: str) -> bytes:
    """
    Call ElevenLabs text-to-speech API.
    
    Args:
        api_key: The ElevenLabs API key.
        voice_id: The voice ID to use.
        text: The text to convert to speech.
        
    Returns:
        The audio content as bytes.
        
    Raises:
        ElevenLabsAPIError: If the API call fails.
    """
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
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60.0)
            
        if response.status_code != 200:
            raise ElevenLabsAPIError(f"ElevenLabs API Error: {response.text}", 502)
        
        return response.content
    except httpx.RequestError as e:
        raise ElevenLabsAPIError(f"ElevenLabs request failed: {str(e)}", 500)


def _create_segments(text: str, audio_url: str) -> List[Dict[str, Any]]:
    """
    Create audio segments for the rehearsal.
    
    Args:
        text: The full text of the rehearsal.
        audio_url: The data URI of the generated audio.
        
    Returns:
        A list of segment dictionaries.
    """
    return [
        {
            "id": "seg-1",
            "index": 0,
            "text": text,
            "audioUrl": audio_url,
            "duration": 0
        }
    ]
