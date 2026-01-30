from typing import List, Any, Dict
from app.core.database import db
from app.models.schemas import RelationCreate


def build_relation_create_data(data: RelationCreate, passage_id: str) -> Dict[str, Any]:
    """
    Transform relation creation data into DB format.
    
    Args:
        data: The relation creation request.
        passage_id: The ID of the passage this relation belongs to.
        
    Returns:
        A dictionary ready for Prisma create operation.
    """
    return {
        "passageId": passage_id,
        "category": data.category,
        "type": data.type,
        "sourceId": data.sourceId,
        "targetId": data.targetId
    }


class RelationService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Any]:
        """
        Retrieve all participant relations for a passage.
        
        Args:
            passage_id: The ID of the passage.
            
        Returns:
            A list of relations with source and target participants included,
            ordered by creation date.
        """
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
    async def create(passage_id: str, data: RelationCreate) -> Any:
        """
        Create a new participant relation.
        
        Args:
            passage_id: The ID of the passage.
            data: The relation creation data.
            
        Returns:
            The created relation with source and target included.
        """
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
    async def update(id: str, data: RelationCreate) -> Any:
        """
        Update an existing participant relation.
        
        Args:
            id: The ID of the relation to update.
            data: The updated relation data.
            
        Returns:
            The updated relation with source and target included.
        """
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
    async def delete(id: str) -> Any:
        """
        Delete a participant relation.
        
        Args:
            id: The ID of the relation to delete.
            
        Returns:
            The deleted relation record.
        """
        return await db.participantrelation.delete(
            where={"id": id}
        )
