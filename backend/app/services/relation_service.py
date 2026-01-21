"""
Relation Service
Business logic for managing participant relations
Functional approach using pure functions and immutable data structures
"""
from typing import List, Optional, Dict, Any
from app.core.database import db
from app.models.schemas import RelationCreate

# ============================================================
# PURE FUNCTIONS
# ============================================================

def build_relation_create_data(data: RelationCreate, passage_id: str) -> Dict[str, Any]:
    """
    Pure function to transform creation data into DB format
    """
    return {
        "passageId": passage_id,
        "category": data.category,
        "type": data.type,
        "sourceId": data.sourceId,
        "targetId": data.targetId
    }

# ============================================================
# SERVICE FUNCTIONS (Async/IO)
# ============================================================

class RelationService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict]:
        """Get all relations for a passage"""
        relations = await db.participantrelation.find_many(
            where={"passageId": passage_id},
            include={
                "source": True,
                "target": True
            },
            order={"createdAt": "asc"}
        )
        return relations

    @staticmethod
    async def create(passage_id: str, data: RelationCreate) -> Dict:
        """Create a new relation"""
        create_data = build_relation_create_data(data, passage_id)
        
        relation = await db.participantrelation.create(
            data=create_data,
            include={
                "source": True,
                "target": True
            }
        )
        return relation

    @staticmethod
    async def update(id: str, data: RelationCreate) -> Dict:
        """Update a relation"""
        # We only update fields, not the passageId (for safety)
        # Note: sourceId and targetId changing might require re-linking logic if strictly relational,
        # but here we just update fields since they are IDs.

        relation = await db.participantrelation.update(
            where={"id": id},
            data={
                "category": data.category,
                "type": data.type,
                "sourceId": data.sourceId,
                "targetId": data.targetId
            },
            include={
                "source": True,
                "target": True
            }
        )
        return relation

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete a relation"""
        return await db.participantrelation.delete(
            where={"id": id}
        )
