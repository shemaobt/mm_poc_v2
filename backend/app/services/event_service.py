"""
Event Service
Business logic for managing events
Functional approach using pure functions and immutable data structures
"""
from typing import List, Dict, Any
from app.core.database import db
from app.models.schemas import EventCreate

# ============================================================
# PURE FUNCTIONS
# ============================================================

def build_event_create_data(data: EventCreate, passage_id: str) -> Dict[str, Any]:
    """
    Pure function to transform creation data into DB format
    """
    event_dict = {
        "passageId": passage_id,
        "eventId": data.eventId,
        "clauseId": data.clauseId,
        "category": data.category,
        "eventCore": data.eventCore,
        "discourseFunction": data.discourseFunction,
        "chainPosition": data.chainPosition,
        "narrativeFunction": data.narrativeFunction,
    }
    
    # Nested writes for Prisma
    if data.roles:
        role_creates = []
        for r in data.roles:
            role_data = {"role": r.role}
            if r.participantId:
                role_data["participant"] = {"connect": {"id": r.participantId}}
            role_creates.append(role_data)
        event_dict["roles"] = {"create": role_creates}
        
    return event_dict

# ============================================================
# SERVICE FUNCTIONS (Async/IO)
# ============================================================

class EventService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict]:
        """Get all events for a passage"""
        events = await db.event.find_many(
            where={"passageId": passage_id},
            include={
                "roles": True,
                # We could include linked objects here if needed
                "clause": True
            },
            order={"eventId": "asc"}
        )
        return events

    @staticmethod
    async def create(passage_id: str, data: EventCreate) -> Dict:
        """Create a new event"""
        # Check if exists (upsert logic could be better but simplistic for now)
        existing = await db.event.find_unique(
            where={
                "passageId_eventId": {
                    "passageId": passage_id,
                    "eventId": data.eventId
                }
            }
        )
        
        if existing:
            # For POC, simple update or error. Let's error or overwrite. 
            # Ideally we'd implement update logic.
            # Let's delete and recreate for simplicity in this POC phase or just return existing
             return await EventService.update(existing.id, data)

        create_data = build_event_create_data(data, passage_id)
        
        event = await db.event.create(
            data=create_data,
            include={"roles": True}
        )
        return event

    @staticmethod
    async def update(id: str, data: EventCreate) -> Dict:
        """Update event and its nested relations"""
        # Prisma update with nested relations is tricky (deleteMany then createMany for replacement)
        
        role_creates = []
        for r in data.roles:
            role_data = {"role": r.role}
            if r.participantId:
                role_data["participant"] = {"connect": {"id": r.participantId}}
            role_creates.append(role_data)

        update_data = {
            "clauseId": data.clauseId,
            "category": data.category,
            "eventCore": data.eventCore,
            "discourseFunction": data.discourseFunction,
            "chainPosition": data.chainPosition,
            "narrativeFunction": data.narrativeFunction,
            "roles": {
                "deleteMany": {}, # Remove old roles
                "create": role_creates,
            },
        }
        
        event = await db.event.update(
            where={"id": id},
            data=update_data,
            include={"roles": True}
        )
        return event

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete an event"""
        return await db.event.delete(
            where={"id": id}
        )
