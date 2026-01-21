"""
Discourse Service
Business logic for managing discourse relations
Functional approach using pure functions and immutable data structures
"""
from typing import List, Dict, Any
from app.core.database import db
from app.models.schemas import DiscourseRelationCreate

# ============================================================
# PURE FUNCTIONS
# ============================================================

def build_discourse_create_data(data: DiscourseRelationCreate, passage_id: str) -> Dict[str, Any]:
    """
    Pure function to transform creation data into DB format
    """
    return {
        "passageId": passage_id,
        "type": data.relationType,  # Map relationType (API) -> type (DB)
        "sourceId": data.sourceId,
        "targetId": data.targetId
    }

def map_to_response(relation) -> Dict:
    """Map DB relation to API response"""
    if not relation:
        return None
        
    return {
        "id": relation.id,
        "passageId": relation.passageId,
        "relationType": relation.type,  # Map type (DB) -> relationType (API)
        "sourceId": relation.sourceId,
        "targetId": relation.targetId,
        "source": relation.source,
        "target": relation.target
    }

# ============================================================
# SERVICE FUNCTIONS (Async/IO)
# ============================================================

class DiscourseService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict]:
        """Get all discourse relations for a passage"""
        relations = await db.discourserelation.find_many(
            where={"passageId": passage_id},
            include={
                "source": {"include": {"roles": True}},
                "target": {"include": {"roles": True}}
            },
        )
        return [map_to_response(r) for r in relations]

    @staticmethod
    async def create(passage_id: str, data: DiscourseRelationCreate) -> Dict:
        """Create a new discourse relation"""
        create_data = build_discourse_create_data(data, passage_id)
        
        relation = await db.discourserelation.create(
            data=create_data,
            include={
                "source": {"include": {"roles": True}},
                "target": {"include": {"roles": True}}
            }
        )
        return map_to_response(relation)

    @staticmethod
    async def update(id: str, data: DiscourseRelationCreate) -> Dict:
        """Update a discourse relation"""
        
        relation = await db.discourserelation.update(
            where={"id": id},
            data={
                "type": data.relationType,  # Map relationType -> type
                "sourceId": data.sourceId,
                "targetId": data.targetId
            },
            include={
                "source": {"include": {"roles": True}},
                "target": {"include": {"roles": True}}
            }
        )
        return map_to_response(relation)

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete a discourse relation"""
        return await db.discourserelation.delete(
            where={"id": id}
        )
