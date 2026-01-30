from datetime import datetime
from typing import Dict, Any, List

from prisma import Prisma


class PassageNotFoundError(Exception):
    pass


async def export_tripod_format(db: Prisma, passage_id: str) -> Dict[str, Any]:
    """
    Export passage data in Tripod v5.2 format.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage to export.
        
    Returns:
        A dictionary containing the passage in Tripod format.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
    """
    passage = await db.passage.find_unique(
        where={"id": passage_id},
        include={
            "clauses": True,
            "participants": True,
            "participantRelations": {"include": {"source": True, "target": True}},
            "events": {"include": {"roles": {"include": {"participant": True}}}},
            "discourseRelations": {"include": {"source": True, "target": True}},
        }
    )
    
    if not passage:
        raise PassageNotFoundError("Passage not found")
    
    return _build_tripod_output(passage)


async def finalize_passage(db: Prisma, passage_id: str) -> Dict[str, Any]:
    """
    Mark a passage as complete.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage to finalize.
        
    Returns:
        A dictionary with the updated passage info.
        
    Raises:
        PassageNotFoundError: If the passage does not exist.
    """
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise PassageNotFoundError("Passage not found")
    
    updated = await db.passage.update(
        where={"id": passage_id},
        data={
            "isComplete": True,
            "completedAt": datetime.now()
        }
    )
    
    return {
        "id": updated.id,
        "reference": updated.reference,
        "isComplete": updated.isComplete,
        "completedAt": updated.completedAt.isoformat() if updated.completedAt else None
    }


async def list_all_passages(db: Prisma) -> Dict[str, List[Dict[str, Any]]]:
    """
    List all passages with summary information.
    
    Args:
        db: The Prisma database client.
        
    Returns:
        A dictionary containing a list of passage summaries.
    """
    passages = await db.passage.find_many(
        order={"createdAt": "desc"},
        include={
            "participants": True,
            "events": True,
            "user": True,
        }
    )
    
    return {
        "passages": [
            {
                "id": p.id,
                "reference": p.reference,
                "isComplete": p.isComplete,
                "completedAt": p.completedAt.isoformat() if p.completedAt else None,
                "createdAt": p.createdAt.isoformat() if p.createdAt else None,
                "peakEvent": p.peakEvent,
                "thematicSpine": p.thematicSpine,
                "participantCount": len(p.participants) if p.participants else 0,
                "eventCount": len(p.events) if p.events else 0,
                "userId": p.userId,
                "ownerName": p.user.username if p.user else None,
            }
            for p in passages
        ]
    }


def _build_tripod_output(passage) -> Dict[str, Any]:
    return {
        "meta": {
            "protocol": "Tripod v5.2",
            "text_ref": passage.reference,
            "source_lang": passage.sourceLang,
            "generated": datetime.now().isoformat(),
            "generator": "BMM v2.0",
            "peak_event_id": passage.peakEvent,
            "thematic_spine": passage.thematicSpine,
            "ordering_note": "Event sequence reflects source text, not prescribed telling order."
        },
        "participants": [
            {
                "id": p.participantId,
                "type": p.type,
                "quantity": p.quantity or "singular",
                "implicit": False,
                "reference": p.referenceStatus,
                "properties": p.properties or [],
                "name_forms": [{
                    "lang": passage.sourceLang,
                    "form": p.hebrew,
                    "gloss": p.gloss
                }]
            }
            for p in (passage.participants or [])
        ],
        "participant_relations": [
            {
                "source_id": r.source.participantId if r.source else r.sourceId,
                "target_id": r.target.participantId if r.target else r.targetId,
                "category": r.category,
                "relation_type": r.type
            }
            for r in (passage.participantRelations or [])
        ],
        "events": [
            {
                "id": e.eventId,
                "category": e.category,
                "event_core": e.eventCore,
                "discourse_function": e.discourseFunction,
                "chain_position": e.chainPosition,
                "narrative_function": e.narrativeFunction,
                "roles": [
                    {
                        "type": role.role,
                        "participant_id": role.participant.participantId if role.participant else role.participantId
                    }
                    for role in (e.roles or [])
                ],
                "anchors": []
            }
            for e in (passage.events or [])
        ],
        "discourse_relations": [
            {
                "source_event_id": r.source.eventId if r.source else r.sourceId,
                "target_event_id": r.target.eventId if r.target else r.targetId,
                "type": r.type
            }
            for r in (passage.discourseRelations or [])
        ]
    }
