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
    from prisma import Json

    # Clear existing data for this passage (allows re-running AI analysis)
    # Order matters due to foreign key constraints
    try:
        await db.discourserelation.delete_many(where={"passageId": passage_id})
        await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
        await db.event.delete_many(where={"passageId": passage_id})
        await db.participantrelation.delete_many(where={"passageId": passage_id})
        await db.participant.delete_many(where={"passageId": passage_id})
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
                props = p.get("properties")
                # Use Json wrapper for properties (required by Prisma 0.15.0)
                # Default to empty list [] instead of None
                properties_value = props if isinstance(props, list) else []
                
                created = await db.participant.create(
                    data={
                        "passage": {"connect": {"id": passage_id}},
                        "participantId": p.get("participantId", p.get("id", "")),
                        "hebrew": p.get("hebrew", ""),
                        "gloss": p.get("gloss", ""),
                        "type": p.get("type", "person"),
                        "quantity": p.get("quantity"),
                        "referenceStatus": p.get("referenceStatus"),
                        "properties": Json(properties_value),
                    }
                )
                participant_id_map[p.get("participantId", p.get("id", ""))] = created.id
                saved_participants.append({
                    "id": created.id,
                    "passageId": passage_id,
                    "participantId": created.participantId,
                    "hebrew": created.hebrew,
                    "gloss": created.gloss,
                    "type": created.type,
                    "quantity": created.quantity,
                    "referenceStatus": created.referenceStatus,
                    "properties": properties_value,
                })
            except Exception as e:
                print(f"Error saving participant: {e}")
    
    # Map from AI event IDs (e1, e2) to database UUIDs
    event_id_map = {}
    # 2. Save events with all sub-models
    if analysis.get("events"):
        for ev in analysis["events"]:
            try:
                event_data = {
                    "passage": {"connect": {"id": passage_id}},
                    "eventId": ev.get("eventId", ev.get("id", "")),
                    "category": ev.get("category", "ACTION"),
                    "eventCore": ev.get("eventCore", ev.get("event_core", "")),
                    "discourseFunction": ev.get("discourseFunction"),
                    "chainPosition": ev.get("chainPosition"),
                    "narrativeFunction": ev.get("narrativeFunction"),
                }
                
                # Add modifiers if present
                mods = ev.get("modifiers", {})
                if mods and any(mods.values()):
                    event_data["modifiers"] = {"create": {
                        "happened": mods.get("happened"),
                        "realness": mods.get("realness"),
                        "when": mods.get("when"),
                        "viewpoint": mods.get("viewpoint"),
                        "phase": mods.get("phase"),
                        "repetition": mods.get("repetition"),
                        "onPurpose": mods.get("onPurpose"),
                        "howKnown": mods.get("howKnown"),
                        "causation": mods.get("causation"),
                    }}
                
                # Add pragmatic if present
                prag = ev.get("pragmatic", {})
                if prag and any(prag.values()):
                    event_data["pragmatic"] = {"create": {
                        "discourseRegister": prag.get("register"),
                        "socialAxis": prag.get("socialAxis"),
                        "prominence": prag.get("prominence"),
                        "pacing": prag.get("pacing"),
                    }}
                
                # Add narrator stance if present
                ns = ev.get("narratorStance", {})
                if ns and ns.get("stance"):
                    event_data["narratorStance"] = {"create": {"stance": ns.get("stance")}}
                
                # Add audience response if present
                ar = ev.get("audienceResponse", {})
                if ar and ar.get("response"):
                    event_data["audienceResponse"] = {"create": {"response": ar.get("response")}}
                
                # Add LA Tags if present
                la = ev.get("laTags", {})
                if la and any(la.values()):
                    event_data["laRetrieval"] = {"create": {
                        "emotionTags": Json(la.get("emotionTags", [])),
                        "eventTags": Json(la.get("eventTags", [])),
                        "registerTags": Json(la.get("registerTags", [])),
                        "discourseTags": Json(la.get("discourseTags", [])),
                        "socialTags": Json(la.get("socialTags", [])),
                    }}
                
                # Add figurative if present and is figurative
                fig = ev.get("figurative", {})
                if fig and fig.get("isFigurative"):
                    event_data["figurative"] = {"create": {
                        "isFigurative": True,
                        "figureType": fig.get("figureType", ""),
                        "sourceDomain": fig.get("sourceDomain"),
                        "targetDomain": fig.get("targetDomain"),
                        "literalMeaning": fig.get("literalMeaning"),
                        "intendedMeaning": fig.get("intendedMeaning"),
                        "transferability": fig.get("transferability"),
                        "translationNote": fig.get("translationNote"),
                    }}
                
                # Add key terms if present
                kts = ev.get("keyTerms", [])
                if kts:
                    event_data["keyTerms"] = {"create": [
                        {
                            "termId": kt.get("termId", f"kt{i}"),
                            "sourceLemma": kt.get("sourceLemma", ""),
                            "semanticDomain": kt.get("semanticDomain", "theological"),
                            "consistency": kt.get("consistency", "preferred"),
                        } for i, kt in enumerate(kts)
                    ]}
                
                created = await db.event.create(
                    data=event_data,
                    include={
                        "modifiers": True,
                        "pragmatic": True,
                        "narratorStance": True,
                        "audienceResponse": True,
                        "laRetrieval": True,
                        "figurative": True,
                        "keyTerms": True,
                    }
                )
                event_id_map[ev.get("eventId", ev.get("id", ""))] = created.id
                
                # Build complete event response
                event_resp = {
                    "id": created.id,
                    "passageId": passage_id,
                    "eventId": created.eventId,
                    "category": created.category,
                    "eventCore": created.eventCore,
                    "discourseFunction": created.discourseFunction,
                    "chainPosition": created.chainPosition,
                    "narrativeFunction": created.narrativeFunction,
                    "roles": [],  # Will be populated after roles are saved
                }
                
                # Add sub-models if present
                if created.modifiers:
                    event_resp["modifiers"] = {
                        "happened": created.modifiers.happened,
                        "realness": created.modifiers.realness,
                        "when": created.modifiers.when,
                        "viewpoint": created.modifiers.viewpoint,
                        "phase": created.modifiers.phase,
                        "repetition": created.modifiers.repetition,
                        "onPurpose": created.modifiers.onPurpose,
                        "howKnown": created.modifiers.howKnown,
                        "causation": created.modifiers.causation,
                    }
                if created.pragmatic:
                    event_resp["pragmatic"] = {
                        "register": created.pragmatic.discourseRegister,
                        "socialAxis": created.pragmatic.socialAxis,
                        "prominence": created.pragmatic.prominence,
                        "pacing": created.pragmatic.pacing,
                    }
                if created.narratorStance:
                    event_resp["narratorStance"] = {"stance": created.narratorStance.stance}
                if created.audienceResponse:
                    event_resp["audienceResponse"] = {"response": created.audienceResponse.response}
                if created.laRetrieval:
                    event_resp["laRetrieval"] = {
                        "emotionTags": created.laRetrieval.emotionTags,
                        "eventTags": created.laRetrieval.eventTags,
                        "registerTags": created.laRetrieval.registerTags,
                        "discourseTags": created.laRetrieval.discourseTags,
                        "socialTags": created.laRetrieval.socialTags,
                    }
                if created.figurative:
                    event_resp["figurative"] = {
                        "isFigurative": created.figurative.isFigurative,
                        "figureType": created.figurative.figureType,
                        "sourceDomain": created.figurative.sourceDomain,
                        "targetDomain": created.figurative.targetDomain,
                        "literalMeaning": created.figurative.literalMeaning,
                        "intendedMeaning": created.figurative.intendedMeaning,
                        "transferability": created.figurative.transferability,
                        "translationNote": created.figurative.translationNote,
                    }
                if created.keyTerms:
                    event_resp["keyTerms"] = [{
                        "id": kt.id,
                        "termId": kt.termId,
                        "sourceLemma": kt.sourceLemma,
                        "semanticDomain": kt.semanticDomain,
                        "consistency": kt.consistency,
                    } for kt in created.keyTerms]
                
                saved_events.append(event_resp)
            except Exception as e:
                print(f"Error saving event: {e}")
    
    # 2b. Save event roles and emotions (separate step to link participants)
    if analysis.get("events"):
        for ev in analysis["events"]:
            event_db_id = event_id_map.get(ev.get("eventId", ev.get("id", "")))
            if not event_db_id:
                continue
            
            # Find the corresponding saved_event to update roles
            saved_event = next((e for e in saved_events if e["id"] == event_db_id), None)
            event_roles = []
            
            # Save roles - only if participant is valid
            if ev.get("roles"):
                for role in ev["roles"]:
                    try:
                        participant_db_id = participant_id_map.get(role.get("participantId"))
                        # Skip roles without valid participant
                        if not participant_db_id:
                            continue
                        
                        role_data = {
                            "event": {"connect": {"id": event_db_id}},
                            "role": role.get("role", role.get("type", "")),
                            "participant": {"connect": {"id": participant_db_id}}
                        }
                        
                        await db.eventrole.create(data=role_data)
                        # Track role for response
                        event_roles.append({
                            "role": role.get("role", role.get("type", "")),
                            "participantId": role.get("participantId")
                        })
                    except Exception as e:
                        print(f"Error saving event role: {e}")
            
            # Update saved_event with roles
            if saved_event:
                saved_event["roles"] = event_roles
            
            # Save emotions (need participant linking)
            event_emotions = []
            if ev.get("emotions"):
                for emo in ev["emotions"]:
                    try:
                        emo_data = {
                            "event": {"connect": {"id": event_db_id}},
                            "primary": emo.get("primary", "neutral"),
                            "secondary": emo.get("secondary"),
                            "intensity": emo.get("intensity", "medium"),
                            "source": emo.get("source", "contextual"),
                            "confidence": emo.get("confidence", "medium"),
                            "notes": emo.get("notes"),
                        }
                        participant_db_id = participant_id_map.get(emo.get("participantId"))
                        if participant_db_id:
                            emo_data["participant"] = {"connect": {"id": participant_db_id}}
                        
                        created_emo = await db.eventemotion.create(data=emo_data)
                        event_emotions.append({
                            "id": created_emo.id,
                            "participantId": emo.get("participantId"),
                            "primary": created_emo.primary,
                            "secondary": created_emo.secondary,
                            "intensity": created_emo.intensity,
                            "source": created_emo.source,
                            "confidence": created_emo.confidence,
                            "notes": created_emo.notes,
                        })
                    except Exception as e:
                        print(f"Error saving event emotion: {e}")
            
            # Update saved_event with emotions
            if saved_event and event_emotions:
                saved_event["emotions"] = event_emotions
    
    # 3. Save participant relations
    rels = analysis.get("relations", [])
    if rels:
        for rel in rels:
            try:
                s_id = rel.get("sourceId")
                t_id = rel.get("targetId")
                source_db_id = participant_id_map.get(s_id)
                target_db_id = participant_id_map.get(t_id)

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
                        "passageId": passage_id,
                        "category": created.category,
                        "type": created.type,
                        "sourceId": s_id,
                        "targetId": t_id,
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
                        "passageId": passage_id,
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
