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
        "relationType": data.relationType,
        "sourceId": data.sourceId,
        "targetId": data.targetId
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
                "source": True,
                "target": True
            },
            # Ordering by logic could be added here if needed
        )
        return relations

    @staticmethod
    async def create(passage_id: str, data: DiscourseRelationCreate) -> Dict:
        """Create a new discourse relation"""
        create_data = build_discourse_create_data(data, passage_id)
        
        relation = await db.discourserelation.create(
            data=create_data,
            include={
                "source": True,
                "target": True
            }
        )
        return relation

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete a discourse relation"""
        return await db.discourserelation.delete(
            where={"id": id}
        )
