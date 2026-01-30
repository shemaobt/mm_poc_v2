import re
import json
from typing import Dict, Any, List, Optional

from prisma import Json, Prisma
from prisma.enums import ApprovalStatus

from app.core.config import get_settings
from app.ai import build_rehearsal_prompt, TARGET_LANGUAGES, call_llm_for_text, LLMConfig


class APIKeyNotConfiguredError(Exception):
    """Raised when ANTHROPIC_API_KEY is not configured."""
    pass


class PassageNotFoundError(Exception):
    """Raised when a passage cannot be found."""
    pass


class RehearsalNotFoundError(Exception):
    """Raised when a rehearsal cannot be found."""
    pass


class InvalidApprovalRoleError(Exception):
    """Raised when an invalid approval role is specified."""
    pass


class InvalidApprovalStatusError(Exception):
    """Raised when an invalid approval status is specified."""
    pass


async def generate_rehearsal(db: Prisma, passage_id: str, target_language: str) -> Any:
    """
    Generate rehearsal text from a passage's meaning map using AI.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        target_language: The target language code.
        
    Returns:
        The created rehearsal record.
        
    Raises:
        APIKeyNotConfiguredError: If ANTHROPIC_API_KEY is not set.
        PassageNotFoundError: If the passage does not exist.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        raise APIKeyNotConfiguredError("ANTHROPIC_API_KEY not configured")
    
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise PassageNotFoundError("Passage not found")
    
    from app.services.export_service import export_tripod_format
    export_data = await export_tripod_format(db, passage_id)
    map_json = json.dumps(export_data, ensure_ascii=False, indent=2)
    
    lang = TARGET_LANGUAGES.get(target_language, TARGET_LANGUAGES["english"])
    prompt = build_rehearsal_prompt(map_json, lang)
    
    generated_text = await _call_llm_for_rehearsal(prompt)
    segments = _segment_text(generated_text)
    
    new_rehearsal = await db.rehearsal.create(
        data={
            "passageId": passage_id,
            "targetLanguage": target_language,
            "fullText": generated_text,
            "segments": Json(segments),
            "fullAudioUrl": None,
            "selectedVoiceId": None
        }
    )
    
    return new_rehearsal


async def save_rehearsal(
    db: Prisma,
    passage_id: str,
    target_language: str,
    full_text: str,
    segments: List[Dict[str, Any]],
    full_audio_url: Optional[str] = None,
    selected_voice_id: Optional[str] = None
) -> Any:
    """
    Save a new rehearsal for a passage.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        target_language: The target language code.
        full_text: The full rehearsal text.
        segments: List of segment dictionaries.
        full_audio_url: Optional URL to full audio.
        selected_voice_id: Optional voice ID for TTS.
        
    Returns:
        The created rehearsal record.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
    """
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise PassageNotFoundError("Passage not found")

    new_rehearsal = await db.rehearsal.create(
        data={
            "passageId": passage_id,
            "targetLanguage": target_language,
            "fullText": full_text,
            "segments": Json(segments),
            "fullAudioUrl": full_audio_url,
            "selectedVoiceId": selected_voice_id
        }
    )
    
    return new_rehearsal


async def get_latest_rehearsal(db: Prisma, passage_id: str) -> Any:
    """
    Get the latest rehearsal for a passage.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        
    Returns:
        The latest rehearsal record.
        
    Raises:
        RehearsalNotFoundError: If no rehearsal exists.
    """
    rehearsal = await db.rehearsal.find_first(
        where={"passageId": passage_id},
        order={"createdAt": "desc"}
    )
    
    if not rehearsal:
        raise RehearsalNotFoundError("No rehearsal found")
        
    return rehearsal


async def update_approval(db: Prisma, passage_id: str, role: str, status: str) -> Any:
    """
    Update approval status for a specific role.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        role: The approval role (validator, mentor, community).
        status: The new status (WAITING, PENDING, APPROVED, CHANGES_REQUESTED).
        
    Returns:
        The updated passage record.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
        InvalidApprovalRoleError: If the role is invalid.
        InvalidApprovalStatusError: If the status is invalid.
    """
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise PassageNotFoundError("Passage not found")

    role_lower = role.lower()
    
    try:
        status_enum = ApprovalStatus[status.upper()]
    except KeyError:
        raise InvalidApprovalStatusError(f"Invalid status: {status}")
        
    data = {}
    if role_lower == "validator":
        data["validatorStatus"] = status_enum
    elif role_lower == "mentor":
        data["mentorStatus"] = status_enum
    elif role_lower == "community":
        data["communityStatus"] = status_enum
    else:
        raise InvalidApprovalRoleError(f"Invalid role: {role}")
        
    updated_passage = await db.passage.update(
        where={"id": passage_id},
        data=data
    )
    
    return updated_passage


async def _call_llm_for_rehearsal(prompt: str) -> str:
    """
    Call LLM to generate rehearsal text using LangChain.
    
    Args:
        prompt: The complete rehearsal prompt.
        
    Returns:
        The generated rehearsal text.
    """
    return await call_llm_for_text(
        system_prompt="",
        user_prompt=prompt,
        model=LLMConfig.MODEL_SONNET,
        max_tokens=LLMConfig.REHEARSAL_MAX_TOKENS,
    )


def _segment_text(text: str) -> List[Dict[str, Any]]:
    """
    Segment generated text into chunks for audio generation.
    """
    segments = []
    sentences = re.split(r'[.!?]+[ \n]+', text)
    buffer = ''
    
    for i, sentence in enumerate(sentences):
        if sentence.strip():
            buffer += sentence.strip()
            if len(buffer) >= 40 or i == len(sentences) - 1:
                if buffer.strip():
                    segments.append({
                        "id": f"seg-{len(segments) + 1}",
                        "index": len(segments),
                        "text": buffer.strip(),
                        "audioUrl": None,
                        "duration": None
                    })
                buffer = ''
    
    if not segments:
        segments.append({
            "id": "seg-1",
            "index": 0,
            "text": text,
            "audioUrl": None,
            "duration": None
        })
    
    return segments
