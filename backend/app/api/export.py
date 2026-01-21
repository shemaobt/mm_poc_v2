"""
Export API Router
Export meaning maps in Tripod v5.2 format
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.core.database import get_db

router = APIRouter()


@router.get("/{passage_id}/export")
async def export_passage(passage_id: str):
    """
    Export passage as Tripod v5.2 JSON format.
    Compatible with mm_poc application.
    """
    db = get_db()
    
    # Get passage with all related data
    passage = await db.passage.find_unique(
        where={"id": passage_id},
        include={
            "clauses": True,
            "participants": True,  # properties is a JSON field, not a relation
            "participantRelations": {"include": {"source": True, "target": True}},
            "events": {"include": {"roles": {"include": {"participant": True}}}},
            "discourseRelations": {"include": {"source": True, "target": True}},
        }
    )
    
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    
    # Build Tripod v5.2 format
    output = {
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
                "anchors": []  # Could be populated from clause data
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
    
    return output


@router.post("/{passage_id}/finalize")
async def finalize_passage(passage_id: str):
    """
    Mark a passage analysis as complete.
    """
    db = get_db()
    
    # Check passage exists
    passage = await db.passage.find_unique(where={"id": passage_id})
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    
    # Update to complete
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


@router.get("")
async def list_all_passages():
    """
    List all meaning maps (both completed and in-progress).
    Shows all passages, not just completed ones.
    Includes userId for ownership checks on the frontend.
    """
    db = get_db()
    
    try:
        # Get all passages, ordered by creation date (most recent first)
        passages = await db.passage.find_many(
            order={"createdAt": "desc"},
            include={
                "participants": True,
                "events": True,
                "user": True,  # Include user for owner info
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
                    "userId": p.userId,  # Owner ID for permission checks
                    "ownerName": p.user.username if p.user else None,  # Owner name for display
                }
                for p in passages
            ]
        }
    except Exception as e:
        print(f"Error listing passages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load passages: {str(e)}")
