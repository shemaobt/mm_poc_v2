"""
Participant Service
Business logic for managing participants
Functional approach using pure functions and immutable data structures
"""
from typing import List, Optional, Dict, Any
from app.core.database import db
from app.models.schemas import ParticipantCreate, ParticipantResponse

# ============================================================
# PURE FUNCTIONS
# ============================================================

def build_participant_create_data(data: ParticipantCreate, passage_id: str) -> Dict[str, Any]:
    """
    Pure function to transform creation data into DB format
    """
    return {
        "passageId": passage_id,
        "participantId": data.participantId,
        "hebrew": data.hebrew,
        "gloss": data.gloss,
        "type": data.type,
        "quantity": data.quantity,
        "referenceStatus": data.referenceStatus,
        "properties": [p.dict() for p in data.properties] if data.properties else []
    }

def build_participant_update_data(data: ParticipantCreate) -> Dict[str, Any]:
    """
    Pure function to transform update data into DB format
    """
    update_dict = {
        "hebrew": data.hebrew,
        "gloss": data.gloss,
        "type": data.type,
        "quantity": data.quantity,
        "referenceStatus": data.referenceStatus,
    }
    
    if data.properties is not None:
        update_dict["properties"] = [p.dict() for p in data.properties]
        
    return update_dict

# ============================================================
# SERVICE FUNCTIONS (Async/IO)
# ============================================================

class ParticipantService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict]:
        """Get all participants for a passage"""
        participants = await db.participant.find_many(
            where={"passageId": passage_id},
            order={"participantId": "asc"}
        )
        return participants

    @staticmethod
    async def create(passage_id: str, data: ParticipantCreate) -> Dict:
        """Create a new participant"""
        # Check if participantId already exists for this passage
        existing = await db.participant.find_unique(
            where={
                "passageId_participantId": {
                    "passageId": passage_id,
                    "participantId": data.participantId
                }
            }
        )
        
        if existing:
            # Update existing if found (upsert logic basically)
            return await ParticipantService.update(existing.id, data)
            
        create_data = build_participant_create_data(data, passage_id)
        
        participant = await db.participant.create(
            data=create_data
        )
        return participant

    @staticmethod
    async def update(id: str, data: ParticipantCreate) -> Dict:
        """Update a participant"""
        update_data = build_participant_update_data(data)
        
        participant = await db.participant.update(
            where={"id": id},
            data=update_data
        )
        return participant

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete a participant"""
        return await db.participant.delete(
            where={"id": id}
        )
