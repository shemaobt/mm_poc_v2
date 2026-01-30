from typing import List, Dict, Any, Optional
from app.core.database import db
from app.models.schemas import DiscourseRelationCreate


def build_discourse_create_data(data: DiscourseRelationCreate, passage_id: str) -> Dict[str, Any]:
    """
    Transform creation data into DB format.
    
    Args:
        data: The discourse relation creation request.
        passage_id: The ID of the passage this relation belongs to.
        
    Returns:
        A dictionary ready for Prisma create operation.
    """
    return {
        "passageId": passage_id,
        "type": data.relationType,
        "sourceId": data.sourceId,
        "targetId": data.targetId
    }


def map_to_response(relation) -> Optional[Dict[str, Any]]:
    """
    Map a DB discourse relation to API response format.
    
    Args:
        relation: The Prisma discourse relation object.
        
    Returns:
        A dictionary with the response format, or None if relation is None.
    """
    if not relation:
        return None
        
    return {
        "id": relation.id,
        "passageId": relation.passageId,
        "relationType": relation.type,
        "sourceId": relation.sourceId,
        "targetId": relation.targetId,
        "source": relation.source,
        "target": relation.target
    }


class DiscourseService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all discourse relations for a passage.
        
        Args:
            passage_id: The ID of the passage.
            
        Returns:
            A list of discourse relations with source and target events included.
        """
        relations = await db.discourserelation.find_many(
            where={"passageId": passage_id},
            include={
                "source": {"include": {"roles": True}},
                "target": {"include": {"roles": True}}
            },
        )
        return [map_to_response(r) for r in relations]

    @staticmethod
    async def create(passage_id: str, data: DiscourseRelationCreate) -> Optional[Dict[str, Any]]:
        """
        Create a new discourse relation.
        
        Args:
            passage_id: The ID of the passage.
            data: The discourse relation creation data.
            
        Returns:
            The created discourse relation in response format.
        """
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
    async def update(id: str, data: DiscourseRelationCreate) -> Optional[Dict[str, Any]]:
        """
        Update an existing discourse relation.
        
        Args:
            id: The ID of the discourse relation to update.
            data: The updated discourse relation data.
            
        Returns:
            The updated discourse relation in response format.
        """
        relation = await db.discourserelation.update(
            where={"id": id},
            data={
                "type": data.relationType,
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
    async def delete(id: str) -> Dict[str, Any]:
        """
        Delete a discourse relation.
        
        Args:
            id: The ID of the discourse relation to delete.
            
        Returns:
            The deleted discourse relation record.
        """
        return await db.discourserelation.delete(
            where={"id": id}
        )
