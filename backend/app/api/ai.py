"""
AI Integration API Router
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

from app.core.database import get_db

router = APIRouter()


class AIPrefillRequest(BaseModel):
    """Request for AI prefill"""
    passage_ref: str
    api_key: str | None = None

@router.post("/prefill")
async def ai_prefill(request: AIPrefillRequest):
    """
    AI prefill all fields for a passage.
    Generates AI analysis AND saves to database.
    """
    # Resolve API Key
    api_key = request.api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key required (not found in request or environment)")
    
    try:
        from app.services.bhsa_service import get_bhsa_service, parse_reference
        
        # Parse reference
        try:
            book, chapter, start_verse, end_verse = parse_reference(request.passage_ref)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Get data from BHSA service
        bhsa_service = get_bhsa_service()
        passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
        
        if not passage_data:
            raise HTTPException(status_code=404, detail="Passage not found")

        # Call AI Service
        from app.services.ai_service import AIService
        analysis = await AIService.analyze_passage(passage_data, api_key)
        
        # Get passage from database to save AI results
        db = get_db()
        passage = await db.passage.find_unique(where={"reference": request.passage_ref})
        
        if not passage:
            raise HTTPException(status_code=404, detail=f"Passage not found in database: {request.passage_ref}")
        
        # Save AI-generated data to database
        saved_data = await _save_ai_analysis(db, passage.id, analysis)
        
        # Create metrics snapshot for tracking
        await _create_metrics_snapshot(db, passage.id, analysis)
        
        # Auto-finalize passage after successful AI prefill
        from datetime import datetime
        await db.passage.update(
            where={"id": passage.id},
            data={
                "isComplete": True,
                "completedAt": datetime.now()
            }
        )
        
        return {
            "status": "success",
            "data": saved_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"AI prefill error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _create_metrics_snapshot(db, passage_id: str, analysis: dict):
    """Create a metrics snapshot for AI tracking"""
    from prisma import Json
    
    try:
        # Create snapshot
        snapshot = await db.aisnapshot.create(
            data={
                "passage": {"connect": {"id": passage_id}},
                "snapshotData": Json(analysis or {})
            }
        )
        
        # Calculate AI item count
        ai_count = 0
        if analysis:
            ai_count += len(analysis.get("participants", []))
            ai_count += len(analysis.get("events", []))
            ai_count += len(analysis.get("relations", []))
            ai_count += len(analysis.get("discourse", []))
        
        # Check for existing summary
        existing_summary = await db.metricssummary.find_unique(
            where={"passageId": passage_id}
        )
        
        if existing_summary:
            await db.metricssummary.update(
                where={"id": existing_summary.id},
                data={"aiItemCount": ai_count}
            )
        else:
            await db.metricssummary.create(
                data={
                    "passageId": passage_id,
                    "aiItemCount": ai_count,
                    "fieldsChanged": Json({})
                }
            )
        
        print(f"[Metrics] Created snapshot for passage {passage_id}, AI items: {ai_count}")
        return snapshot.id
        
    except Exception as e:
        print(f"[Metrics] Error creating snapshot: {e}")
        # Non-fatal error - don't block the main flow
        return None


async def _save_ai_analysis(db, passage_id: str, analysis: dict) -> dict:
    """
    Save AI-generated analysis to database.
    Clears existing data first to allow re-analysis.
    Returns saved data with database IDs.
    """
    # Clear existing data for this passage (allows re-running AI analysis)
    # Order matters due to foreign key constraints
    try:
        await db.discourserelation.delete_many(where={"passageId": passage_id})
        await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
        await db.event.delete_many(where={"passageId": passage_id})
        await db.participantrelation.delete_many(where={"passageId": passage_id})
        await db.participant.delete_many(where={"passageId": passage_id})
        print(f"Cleared existing AI data for passage {passage_id}")
    except Exception as e:
        print(f"Error clearing existing data: {e}")
    
    saved_participants = []
    saved_events = []
    saved_relations = []
    saved_discourse = []
    
    # Map from AI participant IDs (p1, p2) to database UUIDs
    participant_id_map = {}
    
    # 1. Save participants
    if analysis.get("participants"):
        for p in analysis["participants"]:
            try:
                created = await db.participant.create(
                    data={
                        "passage": {"connect": {"id": passage_id}},
                        "participantId": p.get("participantId", p.get("id", "")),
                        "hebrew": p.get("hebrew", ""),
                        "gloss": p.get("gloss", ""),
                        "type": p.get("type", "person"),
                        "quantity": p.get("quantity"),
                        "referenceStatus": p.get("referenceStatus"),
                    }
                )
                participant_id_map[p.get("participantId", p.get("id", ""))] = created.id
                saved_participants.append({
                    "id": created.id,
                    "participantId": created.participantId,
                    "hebrew": created.hebrew,
                    "gloss": created.gloss,
                    "type": created.type,
                    "quantity": created.quantity,
                })
            except Exception as e:
                print(f"Error saving participant: {e}")
    
    # Map from AI event IDs (e1, e2) to database UUIDs
    event_id_map = {}
    
    # 2. Save events
    if analysis.get("events"):
        for ev in analysis["events"]:
            try:
                created = await db.event.create(
                    data={
                        "passage": {"connect": {"id": passage_id}},
                        "eventId": ev.get("eventId", ev.get("id", "")),
                        "category": ev.get("category", "ACTION"),
                        "eventCore": ev.get("eventCore", ev.get("event_core", "")),
                        "discourseFunction": ev.get("discourseFunction"),
                        "chainPosition": ev.get("chainPosition"),
                        "narrativeFunction": ev.get("narrativeFunction"),
                    }
                )
                event_id_map[ev.get("eventId", ev.get("id", ""))] = created.id
                
                saved_events.append({
                    "id": created.id,
                    "eventId": created.eventId,
                    "category": created.category,
                    "eventCore": created.eventCore,
                    "roles": ev.get("roles", []),
                })
            except Exception as e:
                print(f"Error saving event: {e}")
    
    # 2b. Save event roles (separate step to avoid blocking events)
    if analysis.get("events"):
        for ev in analysis["events"]:
            event_db_id = event_id_map.get(ev.get("eventId", ev.get("id", "")))
            if not event_db_id:
                continue
            
            if ev.get("roles"):
                for role in ev["roles"]:
                    try:
                        participant_db_id = participant_id_map.get(role.get("participantId"))
                        role_data = {
                            "event": {"connect": {"id": event_db_id}},
                            "role": role.get("role", role.get("type", "")),
                        }
                        # Use relation connect rather than raw scalar to match Prisma input
                        if participant_db_id:
                            role_data["participant"] = {"connect": {"id": participant_db_id}}
                        
                        await db.eventrole.create(data=role_data)
                    except Exception as e:
                        print(f"Error saving event role: {e}")
    
    # 3. Save participant relations
    if analysis.get("relations"):
        for rel in analysis["relations"]:
            try:
                source_db_id = participant_id_map.get(rel.get("sourceId"))
                target_db_id = participant_id_map.get(rel.get("targetId"))
                
                if source_db_id and target_db_id:
                    created = await db.participantrelation.create(
                        data={
                            "passage": {"connect": {"id": passage_id}},
                            "category": rel.get("category", "social"),
                            "type": rel.get("type", ""),
                            "source": {"connect": {"id": source_db_id}},
                            "target": {"connect": {"id": target_db_id}},
                        }
                    )
                    saved_relations.append({
                        "id": created.id,
                        "category": created.category,
                        "type": created.type,
                        "sourceId": rel.get("sourceId"),
                        "targetId": rel.get("targetId"),
                    })
            except Exception as e:
                print(f"Error saving relation: {e}")
    
    # 4. Save discourse relations
    if analysis.get("discourse"):
        for disc in analysis["discourse"]:
            try:
                source_db_id = event_id_map.get(disc.get("sourceId"))
                target_db_id = event_id_map.get(disc.get("targetId"))
                
                if source_db_id and target_db_id:
                    created = await db.discourserelation.create(
                        data={
                            "passage": {"connect": {"id": passage_id}},
                            "type": disc.get("relationType", disc.get("type", "")),
                            "source": {"connect": {"id": source_db_id}},
                            "target": {"connect": {"id": target_db_id}},
                        }
                    )
                    saved_discourse.append({
                        "id": created.id,
                        "relationType": created.type,
                        "sourceId": disc.get("sourceId"),
                        "targetId": disc.get("targetId"),
                    })
            except Exception as e:
                print(f"Error saving discourse relation: {e}")
    
    return {
        "participants": saved_participants,
        "events": saved_events,
        "relations": saved_relations,
        "discourse": saved_discourse,
    }


@router.get("/models")
async def list_ai_models():
    """List available AI models"""
    return {
        "models": [
            {"id": "claude", "name": "Claude (Anthropic)"},
            {"id": "gemini", "name": "Gemini (Google)"}
        ]
    }
