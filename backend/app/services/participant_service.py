from typing import List, Optional, Dict, Any
from prisma import Json
from app.core.database import db
from app.models.schemas import ParticipantCreate, ParticipantResponse


def build_participant_create_data(data: ParticipantCreate, passage_id: str) -> Dict[str, Any]:
    """
    Transform participant creation data into DB format.
    
    Args:
        data: The participant creation request.
        passage_id: The ID of the passage this participant belongs to.
        
    Returns:
        A dictionary ready for Prisma create operation.
    """
    return {
        "passage": {"connect": {"id": passage_id}},
        "participantId": data.participantId,
        "hebrew": data.hebrew,
        "gloss": data.gloss,
        "type": data.type,
        "quantity": data.quantity,
        "referenceStatus": data.referenceStatus,
        "properties": Json([p.dict() for p in data.properties] if data.properties else [])
    }


def build_participant_update_data(data: ParticipantCreate) -> Dict[str, Any]:
    """
    Transform participant update data into DB format.
    
    Args:
        data: The participant update request.
        
    Returns:
        A dictionary ready for Prisma update operation.
    """
    update_dict = {
        "hebrew": data.hebrew,
        "gloss": data.gloss,
        "type": data.type,
        "quantity": data.quantity,
        "referenceStatus": data.referenceStatus,
    }
    
    if data.properties is not None:
        update_dict["properties"] = Json([p.dict() for p in data.properties])
        
    return update_dict


def natural_sort_key_for_participant(participant) -> tuple:
    """
    Generate a sort key for natural ordering of participants by ID.
    
    Args:
        participant: A participant object with participantId attribute.
        
    Returns:
        A tuple (priority, value) for sorting. Priority 0 for p<number> format,
        priority 1 for other formats.
    """
    s = participant.participantId
    if s.startswith('p') and s[1:].isdigit():
        return (0, int(s[1:]))
    return (1, s)


class ParticipantService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Any]:
        """
        Retrieve all participants for a passage, sorted by participant ID.
        
        Args:
            passage_id: The ID of the passage.
            
        Returns:
            A list of participants sorted naturally by participantId (p1, p2, ..., p10).
        """
        participants = await db.participant.find_many(
            where={"passageId": passage_id}
        )
        return sorted(participants, key=natural_sort_key_for_participant)

    @staticmethod
    async def create(passage_id: str, data: ParticipantCreate) -> Any:
        """
        Create a new participant or update if participantId already exists.
        
        Args:
            passage_id: The ID of the passage.
            data: The participant creation data.
            
        Returns:
            The created or updated participant record.
        """
        existing = await db.participant.find_unique(
            where={
                "passageId_participantId": {
                    "passageId": passage_id,
                    "participantId": data.participantId
                }
            }
        )
        
        if existing:
            return await ParticipantService.update(existing.id, data)
            
        create_data = build_participant_create_data(data, passage_id)
        
        participant = await db.participant.create(
            data=create_data
        )
        return participant

    @staticmethod
    async def update(id: str, data: ParticipantCreate) -> Any:
        """
        Update an existing participant.
        
        Args:
            id: The ID of the participant to update.
            data: The updated participant data.
            
        Returns:
            The updated participant record.
        """
        update_data = build_participant_update_data(data)
        
        participant = await db.participant.update(
            where={"id": id},
            data=update_data
        )
        return participant

    @staticmethod
    async def delete(id: str) -> Any:
        """
        Delete a participant.
        
        Args:
            id: The ID of the participant to delete.
            
        Returns:
            The deleted participant record.
        """
        return await db.participant.delete(
            where={"id": id}
        )
