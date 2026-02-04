import json
from datetime import datetime
from typing import Dict, Any, List, Optional, AsyncGenerator

from prisma import Json, Prisma

from app.core.config import get_settings


class APIKeyNotConfiguredError(Exception):
    """Raised when ANTHROPIC_API_KEY is not configured."""
    pass


class PassageNotFoundError(Exception):
    """Raised when a passage cannot be found."""
    pass


class NoParticipantsError(Exception):
    """Raised when Phase 2 is attempted without participants."""
    pass


async def clear_ai_data(
    db: Prisma,
    passage_id: str, 
    clear_all: bool = False, 
    clear_events_only: bool = False
) -> None:
    """
    Clear AI-generated data for a passage.
    
    Args:
        db: Prisma database client.
        passage_id: The ID of the passage.
        clear_all: If True, clear all AI data (participants, relations, events, discourse).
        clear_events_only: If True, clear only events and discourse.
    """
    
    try:
        if clear_all:
            await db.discourserelation.delete_many(where={"passageId": passage_id})
            await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventmodifier.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventemotion.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventpragmatic.delete_many(where={"event": {"passageId": passage_id}})
            await db.event.delete_many(where={"passageId": passage_id})
            await db.participantrelation.delete_many(where={"passageId": passage_id})
            await db.participant.delete_many(where={"passageId": passage_id})
        elif clear_events_only:
            await db.discourserelation.delete_many(where={"passageId": passage_id})
            await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventmodifier.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventemotion.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventpragmatic.delete_many(where={"event": {"passageId": passage_id}})
            await db.event.delete_many(where={"passageId": passage_id})
            
    except Exception as e:
        print(f"Error clearing data: {e}")


async def save_phase1_data(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Dict[str, List[Any]]:
    """
    Save Phase 1 data: Participants and Relations.
    
    Args:
        db: Prisma database client.
        passage_id: The ID of the passage.
        analysis: The AI analysis containing participants and relations.
        
    Returns:
        A dictionary with saved participants and relations.
    """
    
    saved_participants = []
    saved_relations = []
    participant_id_map = {}
    
    if analysis.get("participants"):
        for p in analysis["participants"]:
            try:
                props = p.get("properties")
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
                saved_participants.append(created.model_dump() if hasattr(created, 'model_dump') else created.dict())
            except Exception as e:
                print(f"Error saving participant: {e}")

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
                    saved_relations.append(created.model_dump() if hasattr(created, 'model_dump') else created.dict())
            except Exception as e:
                print(f"Error saving relation: {e}")
                
    return {"participants": saved_participants, "relations": saved_relations}


async def save_phase2_data(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Dict[str, List[Any]]:
    """
    Save Phase 2 data: Events and Discourse relations.
    
    Args:
        db: Prisma database client.
        passage_id: The ID of the passage.
        analysis: The AI analysis containing events and discourse.
        
    Returns:
        A dictionary with saved events and discourse relations.
    """
    await clear_ai_data(db, passage_id, clear_events_only=True)
    
    db_participants = await db.participant.find_many(where={"passageId": passage_id})
    participant_id_map = {p.participantId: p.id for p in db_participants}
    
    db_clauses = await db.clause.find_many(where={"passageId": passage_id}, order={"clauseIndex": "asc"})
    clause_map = {str(c.clauseIndex + 1): c.id for c in db_clauses}

    saved_events = []
    saved_discourse = []
    event_id_map = {}
    
    if analysis.get("events"):
        for ev in analysis["events"]:
            try:
                event_data, event_id_str = _build_event_data(ev, passage_id, clause_map, participant_id_map)
                
                created = await db.event.create(
                    data=event_data,
                    include={
                        "modifiers": True,
                        "pragmatic": True,
                        "speechAct": True,
                        "emotions": True,
                        "narratorStance": True,
                        "audienceResponse": True,
                        "laRetrieval": True,
                        "figurative": True,
                        "keyTerms": True,
                        "roles": {"include": {"participant": True}},
                    }
                )
                event_id_map[event_id_str] = created.id
                
                created_roles = await _save_event_roles(db, ev, created.id, participant_id_map)
                
                event_response = _build_event_response(created, passage_id, created_roles)
                saved_events.append(event_response)
            except Exception as e:
                print(f"Error saving event: {e}")

    if analysis.get("discourse"):
        for disc in analysis["discourse"]:
            try:
                s_id = event_id_map.get(disc.get("sourceId"))
                t_id = event_id_map.get(disc.get("targetId"))
                if s_id and t_id:
                    created = await db.discourserelation.create(data={
                        "passage": {"connect": {"id": passage_id}},
                        "type": disc.get("relationType", disc.get("type", "")),
                        "source": {"connect": {"id": s_id}},
                        "target": {"connect": {"id": t_id}}
                    })
                    saved_discourse.append(created.model_dump() if hasattr(created, 'model_dump') else created.dict())
            except Exception as e:
                print(f"Error saving discourse: {e}")

    return {"events": saved_events, "discourse": saved_discourse}


async def save_phase2_data_streaming(
    db: Prisma,
    passage_id: str, 
    analysis: Dict[str, Any]
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Save Phase 2 data with streaming progress updates.
    
    Args:
        db: Prisma database client.
        passage_id: The ID of the passage.
        analysis: The AI analysis containing events and discourse.
        
    Yields:
        Progress dictionaries with step, current, total, and message.
    """
    await clear_ai_data(db, passage_id, clear_events_only=True)
    
    db_participants = await db.participant.find_many(where={"passageId": passage_id})
    participant_id_map = {p.participantId: p.id for p in db_participants}
    
    db_clauses = await db.clause.find_many(where={"passageId": passage_id}, order={"clauseIndex": "asc"})
    clause_map = {str(c.clauseIndex + 1): c.id for c in db_clauses}
    
    event_id_map = {}
    events_list = analysis.get("events", [])
    discourse_list = analysis.get("discourse", [])
    total_events = len(events_list)
    total_discourse = len(discourse_list)
    
    yield {"step": "saving_events", "message": f"Saving {total_events} events...", "total": total_events}
    
    for idx, ev in enumerate(events_list):
        try:
            event_data, event_id_str = _build_event_data(ev, passage_id, clause_map, participant_id_map)
            
            created = await db.event.create(data=event_data)
            event_id_map[event_id_str] = created.id
            
            await _save_event_roles(ev, created.id, participant_id_map)
            
            yield {
                "step": "event",
                "current": idx + 1,
                "total": total_events,
                "eventId": event_id_str,
                "message": f"Saved event {event_id_str} ({idx + 1}/{total_events})"
            }
            
        except Exception as e:
            print(f"Error saving event {ev.get('eventId')}: {e}")
            yield {"step": "event_error", "eventId": ev.get("eventId"), "error": str(e)}
    
    yield {"step": "saving_discourse", "message": f"Saving {total_discourse} discourse relations...", "total": total_discourse}
    
    for idx, disc in enumerate(discourse_list):
        try:
            s_id = event_id_map.get(disc.get("sourceId"))
            t_id = event_id_map.get(disc.get("targetId"))
            if s_id and t_id:
                await db.discourserelation.create(data={
                    "passage": {"connect": {"id": passage_id}},
                    "type": disc.get("relationType", disc.get("type", "")),
                    "source": {"connect": {"id": s_id}},
                    "target": {"connect": {"id": t_id}}
                })
            
            yield {
                "step": "discourse",
                "current": idx + 1,
                "total": total_discourse,
                "message": f"Saved discourse relation ({idx + 1}/{total_discourse})"
            }
            
        except Exception as e:
            print(f"Error saving discourse: {e}")
    
    yield {"step": "saved", "message": f"Saved {total_events} events and {total_discourse} discourse relations"}


async def run_full_analysis_stream(
    db: Prisma,
    passage_ref: str
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Run full AI analysis with streaming progress updates.
    
    Args:
        db: Prisma database client.
        passage_ref: The passage reference (e.g., "Ruth 1:1-6").
        
    Yields:
        Progress dictionaries for each step of the analysis.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        yield {"step": "error", "message": "ANTHROPIC_API_KEY not configured"}
        return
    
    try:
        from app.services.bhsa_service import get_bhsa_service, parse_reference
        from app.services.ai_service import AIService
        
        yield {"step": "init", "phase": 0, "message": "Starting AI analysis..."}
        
        book, chapter, start_verse, end_verse = parse_reference(passage_ref)
        bhsa_service = get_bhsa_service()
        passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
        
        passage = await db.passage.find_unique(where={"reference": passage_ref})
        if not passage:
            yield {"step": "error", "message": "Passage not found"}
            return
        
        yield {"step": "ai_phase1", "phase": 1, "message": "Calling Claude AI for participants..."}
        
        analysis_p1 = await AIService.analyze_participants(passage_data)
        
        total_participants = len(analysis_p1.get("participants", []))
        total_relations = len(analysis_p1.get("relations", []))
        
        yield {
            "step": "ai_phase1_complete", 
            "phase": 1, 
            "message": f"AI found {total_participants} participants", 
            "totalParticipants": total_participants, 
            "totalRelations": total_relations
        }
        
        yield {
            "step": "saving_participants", 
            "phase": 1, 
            "message": f"Saving {total_participants} participants...", 
            "total": total_participants
        }
        
        await clear_ai_data(db, passage.id, clear_all=True)
        
        participant_id_map = {}
        for idx, p in enumerate(analysis_p1.get("participants", [])):
            try:
                created = await db.participant.create(
                    data={
                        "passage": {"connect": {"id": passage.id}},
                        "participantId": p.get("participantId", f"p{idx+1}"),
                        "hebrew": p.get("hebrew", ""),
                        "gloss": p.get("gloss", ""),
                        "type": p.get("type", "person"),
                        "quantity": p.get("quantity"),
                        "referenceStatus": p.get("referenceStatus"),
                        "properties": Json(p.get("properties") or [])
                    }
                )
                participant_id_map[p.get("participantId")] = created.id
                
                yield {
                    "step": "participant", 
                    "phase": 1, 
                    "current": idx + 1, 
                    "total": total_participants, 
                    "participantId": p.get("participantId"), 
                    "message": f"Saved participant {idx + 1}/{total_participants}"
                }
            except Exception as e:
                print(f"Error saving participant: {e}")
        
        yield {
            "step": "saving_relations", 
            "phase": 2, 
            "message": f"Saving {total_relations} relations...", 
            "total": total_relations
        }
        
        for idx, rel in enumerate(analysis_p1.get("relations", [])):
            try:
                s_id = rel.get("sourceId")
                t_id = rel.get("targetId")
                source_db_id = participant_id_map.get(s_id)
                target_db_id = participant_id_map.get(t_id)
                
                if source_db_id and target_db_id:
                    await db.participantrelation.create(
                        data={
                            "passage": {"connect": {"id": passage.id}},
                            "category": rel.get("category", "social"),
                            "type": rel.get("type", ""),
                            "source": {"connect": {"id": source_db_id}},
                            "target": {"connect": {"id": target_db_id}},
                        }
                    )
                
                yield {
                    "step": "relation", 
                    "phase": 2, 
                    "current": idx + 1, 
                    "total": total_relations, 
                    "message": f"Saved relation {idx + 1}/{total_relations}"
                }
            except Exception as e:
                print(f"Error saving relation: {e}")
        
        participants_context = json.dumps([{
            "participantId": p.get("participantId"),
            "hebrew": p.get("hebrew"),
            "gloss": p.get("gloss"),
            "type": p.get("type")
        } for p in analysis_p1.get("participants", [])], indent=2, ensure_ascii=False)
        
        passage_data = await _inject_display_units(passage, passage_data, AIService)
        
        yield {"step": "ai_phase2", "phase": 3, "message": "Calling Claude AI for events..."}
        
        analysis_p2 = await AIService.analyze_events(passage_data, participants_context)
        
        total_events = len(analysis_p2.get("events", []))
        total_discourse = len(analysis_p2.get("discourse", []))
        
        yield {
            "step": "ai_phase2_complete", 
            "phase": 3, 
            "message": f"AI found {total_events} events", 
            "totalEvents": total_events, 
            "totalDiscourse": total_discourse
        }
        
        yield {
            "step": "saving_events", 
            "phase": 3, 
            "message": f"Saving {total_events} events...", 
            "total": total_events
        }
        
        await clear_ai_data(db, passage.id, clear_events_only=True)
        
        db_clauses = await db.clause.find_many(where={"passageId": passage.id}, order={"clauseIndex": "asc"})
        clause_map = {str(c.clauseIndex + 1): c.id for c in db_clauses}
        
        db_participants = await db.participant.find_many(where={"passageId": passage.id})
        participant_id_map = {p.participantId: p.id for p in db_participants}
        
        event_id_map = {}
        for idx, ev in enumerate(analysis_p2.get("events", [])):
            try:
                event_data, event_id_str = _build_event_data(ev, passage.id, clause_map, participant_id_map, idx)
                
                created = await db.event.create(data=event_data)
                event_id_map[event_id_str] = created.id
                
                for role in ev.get("roles", []):
                    p_id = participant_id_map.get(role.get("participantId"))
                    if p_id:
                        await db.eventrole.create(data={
                            "event": {"connect": {"id": created.id}},
                            "role": role.get("role", "doer"),
                            "participant": {"connect": {"id": p_id}}
                        })
                
                yield {
                    "step": "event", 
                    "phase": 3, 
                    "current": idx + 1, 
                    "total": total_events, 
                    "eventId": event_id_str, 
                    "message": f"Saved event {idx + 1}/{total_events}"
                }
            except Exception as e:
                print(f"Error saving event {ev.get('eventId')}: {e}")
        
        yield {
            "step": "saving_discourse", 
            "phase": 4, 
            "message": f"Saving {total_discourse} discourse relations...", 
            "total": total_discourse
        }
        
        for idx, disc in enumerate(analysis_p2.get("discourse", [])):
            try:
                s_id = event_id_map.get(disc.get("sourceId"))
                t_id = event_id_map.get(disc.get("targetId"))
                if s_id and t_id:
                    await db.discourserelation.create(data={
                        "passage": {"connect": {"id": passage.id}},
                        "type": disc.get("relationType", disc.get("type", "")),
                        "source": {"connect": {"id": s_id}},
                        "target": {"connect": {"id": t_id}}
                    })
                
                yield {
                    "step": "discourse", 
                    "phase": 4, 
                    "current": idx + 1, 
                    "total": total_discourse, 
                    "message": f"Saved discourse {idx + 1}/{total_discourse}"
                }
            except Exception as e:
                print(f"Error saving discourse: {e}")
        
        await db.passage.update(
            where={"id": passage.id},
            data={"isComplete": True, "completedAt": datetime.now()}
        )
        
        yield {
            "step": "complete", 
            "phase": 5, 
            "message": "Analysis complete!", 
            "summary": {
                "participants": total_participants, 
                "relations": total_relations, 
                "events": total_events, 
                "discourse": total_discourse
            }
        }
        
    except Exception as e:
        print(f"Full Stream Error: {e}")
        import traceback
        traceback.print_exc()
        yield {"step": "error", "message": str(e)}


async def run_phase1(db: Prisma, passage_ref: str) -> Dict[str, Any]:
    """
    Run Phase 1 analysis: Participants and Relations.
    
    Args:
        db: Prisma database client.
        passage_ref: The passage reference.
        
    Returns:
        A dictionary with status and saved data.
        
    Raises:
        APIKeyNotConfiguredError: If no API key is available.
        PassageNotFoundError: If the passage doesn't exist.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        raise APIKeyNotConfiguredError("API Key required")
    
    from app.services.bhsa_service import get_bhsa_service, parse_reference
    from app.services.ai_service import AIService
    
    book, chapter, start_verse, end_verse = parse_reference(passage_ref)
    bhsa_service = get_bhsa_service()
    passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
    
    analysis = await AIService.analyze_participants(passage_data)
    
    passage = await db.passage.find_unique(where={"reference": passage_ref})
    if not passage:
        raise PassageNotFoundError("Passage not found")

    await clear_ai_data(db, passage.id, clear_all=True)
    saved_data = await save_phase1_data(db, passage.id, analysis)
    
    return {"status": "success", "data": saved_data}


async def run_phase2(db: Prisma, passage_ref: str) -> Dict[str, Any]:
    """
    Run Phase 2 analysis: Events and Discourse.
    
    Args:
        db: Prisma database client.
        passage_ref: The passage reference.
        
    Returns:
        A dictionary with status and saved data.
        
    Raises:
        PassageNotFoundError: If the passage doesn't exist.
        NoParticipantsError: If no participants exist.
        APIKeyNotConfiguredError: If ANTHROPIC_API_KEY is not configured.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        raise APIKeyNotConfiguredError("ANTHROPIC_API_KEY not configured")
    
    from app.services.bhsa_service import get_bhsa_service, parse_reference
    from app.services.ai_service import AIService
    
    book, chapter, start_verse, end_verse = parse_reference(passage_ref)
    bhsa_service = get_bhsa_service()
    passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
    
    passage = await db.passage.find_unique(where={"reference": passage_ref})
    if not passage:
        raise PassageNotFoundError("Passage not found")
        
    db_participants = await db.participant.find_many(where={"passageId": passage.id})
    
    if not db_participants:
        analysis_p1 = await AIService.analyze_participants(passage_data)
        await clear_ai_data(db, passage.id, clear_all=True)
        await save_phase1_data(db, passage.id, analysis_p1)
        db_participants = await db.participant.find_many(where={"passageId": passage.id})
    
    if not db_participants:
        raise NoParticipantsError("No participants found. Run Phase 1 first (or provide API key).")
        
    participants_context = json.dumps([{
        "participantId": p.participantId,
        "hebrew": p.hebrew,
        "gloss": p.gloss,
        "type": p.type,
        "quantity": p.quantity,
        "referenceStatus": p.referenceStatus,
        "properties": p.properties
    } for p in db_participants], indent=2, ensure_ascii=False)
    
    passage_data = await _inject_display_units(passage, passage_data, AIService)
    
    analysis = await AIService.analyze_events(passage_data, participants_context)
    
    await clear_ai_data(db, passage.id, clear_events_only=True)
    saved_data = await save_phase2_data(db, passage.id, analysis)
    
    await db.passage.update(
        where={"id": passage.id},
        data={"isComplete": True, "completedAt": datetime.now()}
    )
    
    return {"status": "success", "data": saved_data}


async def run_phase2_stream(
    db: Prisma,
    passage_ref: str
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Run Phase 2 analysis with streaming progress updates.
    
    Args:
        db: Prisma database client.
        passage_ref: The passage reference.
        
    Yields:
        Progress dictionaries for each step.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        yield {"step": "error", "message": "ANTHROPIC_API_KEY not configured"}
        return
    
    try:
        from app.services.bhsa_service import get_bhsa_service, parse_reference
        from app.services.ai_service import AIService
        
        yield {"step": "init", "message": "Starting Phase 2 analysis..."}
        
        book, chapter, start_verse, end_verse = parse_reference(passage_ref)
        bhsa_service = get_bhsa_service()
        passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
        
        passage = await db.passage.find_unique(where={"reference": passage_ref})
        if not passage:
            yield {"step": "error", "message": "Passage not found"}
            return
        
        db_participants = await db.participant.find_many(where={"passageId": passage.id})
        
        if not db_participants:
            yield {"step": "phase1_first", "message": "No participants found. Running Phase 1 first..."}
            analysis_p1 = await AIService.analyze_participants(passage_data)
            await clear_ai_data(db, passage.id, clear_all=True)
            await save_phase1_data(db, passage.id, analysis_p1)
            db_participants = await db.participant.find_many(where={"passageId": passage.id})
        
        if not db_participants:
            yield {"step": "error", "message": "No participants found. Run Phase 1 first (or provide API key)."}
            return
        
        participants_context = json.dumps([{
            "participantId": p.participantId,
            "hebrew": p.hebrew,
            "gloss": p.gloss,
            "type": p.type,
            "quantity": p.quantity,
            "referenceStatus": p.referenceStatus,
            "properties": p.properties
        } for p in db_participants], indent=2, ensure_ascii=False)
        
        passage_data = await _inject_display_units(passage, passage_data, AIService)
        
        yield {"step": "ai_call", "message": "Calling Claude AI for events analysis..."}
        
        analysis = await AIService.analyze_events(passage_data, participants_context)
        
        total_events = len(analysis.get("events", []))
        total_discourse = len(analysis.get("discourse", []))
        
        yield {
            "step": "ai_complete", 
            "message": f"AI returned {total_events} events and {total_discourse} discourse relations", 
            "totalEvents": total_events, 
            "totalDiscourse": total_discourse
        }
        
        await clear_ai_data(db, passage.id, clear_events_only=True)
        
        async for progress in save_phase2_data_streaming(db, passage.id, analysis):
            yield progress
        
        await db.passage.update(
            where={"id": passage.id},
            data={"isComplete": True, "completedAt": datetime.now()}
        )
        
        yield {"step": "complete", "message": "Phase 2 complete!"}
        
    except Exception as e:
        print(f"Phase 2 Stream Error: {e}")
        yield {"step": "error", "message": str(e)}


async def create_metrics_snapshot(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Optional[str]:
    """
    Create a metrics snapshot for AI tracking.
    
    Args:
        db: Prisma database client.
        passage_id: The ID of the passage.
        analysis: The AI analysis data.
        
    Returns:
        The snapshot ID, or None if creation failed.
    """
    
    try:
        snapshot = await db.aisnapshot.create(
            data={
                "passage": {"connect": {"id": passage_id}},
                "snapshotData": Json(analysis or {})
            }
        )
        
        ai_count = 0
        if analysis:
            ai_count += len(analysis.get("participants", []))
            ai_count += len(analysis.get("events", []))
            ai_count += len(analysis.get("relations", []))
            ai_count += len(analysis.get("discourse", []))
        
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
        
        return snapshot.id
        
    except Exception as e:
        print(f"[Metrics] Error creating snapshot: {e}")
        return None


def _build_event_data(
    ev: Dict[str, Any], 
    passage_id: str, 
    clause_map: Dict[str, str], 
    participant_id_map: Dict[str, str],
    idx: int = 0
) -> tuple[Dict[str, Any], str]:
    """
    Build event data dictionary for database creation.
    
    Args:
        ev: The event data from AI.
        passage_id: The passage ID.
        clause_map: Mapping from clause index to DB ID.
        participant_id_map: Mapping from participant ID to DB ID.
        idx: Event index for fallback ID.
        
    Returns:
        A tuple of (event_data dict, event_id_str).
    """
    ai_clause_ids = ev.get("clauseIds")
    if ai_clause_ids is None:
        ai_clause_ids = [ev.get("clauseId")] if ev.get("clauseId") else []
    ai_clause_ids = [int(x) for x in ai_clause_ids if x is not None and str(x).strip()]
    ai_clause_id = str(ai_clause_ids[0]) if ai_clause_ids else str(ev.get("clauseId", ""))
    db_clause_id = clause_map.get(ai_clause_id)
    event_id_str = ev.get("eventId", ev.get("id", f"e{idx+1}"))
    
    event_data: Dict[str, Any] = {
        "passage": {"connect": {"id": passage_id}},
        "eventId": event_id_str,
        "category": ev.get("category", "ACTION"),
        "eventCore": ev.get("eventCore", ev.get("event_core", "")),
        "discourseFunction": ev.get("discourseFunction"),
        "chainPosition": ev.get("chainPosition"),
        "narrativeFunction": ev.get("narrativeFunction"),
    }
    
    if ai_clause_ids:
        event_data["unitClauseIds"] = Json(ai_clause_ids)
    if db_clause_id:
        event_data["clause"] = {"connect": {"id": db_clause_id}}

    mods = ev.get("modifiers", {})
    if mods and any(mods.values()):
        event_data["modifiers"] = {"create": {
            "happened": mods.get("happened"), "realness": mods.get("realness"), "when": mods.get("when"),
            "viewpoint": mods.get("viewpoint"), "phase": mods.get("phase"), "repetition": mods.get("repetition"),
            "onPurpose": mods.get("onPurpose"), "howKnown": mods.get("howKnown"), "causation": mods.get("causation")
        }}
    
    prag = ev.get("pragmatic", {})
    if prag and any(prag.values()):
        event_data["pragmatic"] = {"create": {
            "discourseRegister": prag.get("register"), "socialAxis": prag.get("socialAxis"),
            "prominence": prag.get("prominence"), "pacing": prag.get("pacing")
        }}

    sp = ev.get("speechAct", {})
    if sp and sp.get("type"):
        event_data["speechAct"] = {"create": {
            "type": sp.get("type", "stating"),
            "quotationType": sp.get("quotationType")
        }}
        
    if ev.get("emotions"):
        emotion_creates = []
        for emo in ev["emotions"]:
            if not emo.get("primary"):
                continue
            emo_data = {
                "primary": emo.get("primary"),
                "secondary": emo.get("secondary"),
                "intensity": emo.get("intensity", "medium"),
                "source": emo.get("source", "lexical"),
                "confidence": emo.get("confidence", "high"),
                "notes": emo.get("notes")
            }
            if emo.get("participantId"):
                p_id = participant_id_map.get(emo.get("participantId"))
                if p_id:
                    emo_data["participant"] = {"connect": {"id": p_id}}
            emotion_creates.append(emo_data)
        if emotion_creates:
            event_data["emotions"] = {"create": emotion_creates}

    ns = ev.get("narratorStance", {})
    if ns and ns.get("stance"):
        event_data["narratorStance"] = {"create": {"stance": ns.get("stance")}}

    ar = ev.get("audienceResponse", {})
    if ar and ar.get("response"):
        event_data["audienceResponse"] = {"create": {"response": ar.get("response")}}

    la = ev.get("laRetrieval", {}) or ev.get("laTags", {})
    if la and any(la.values()):
        event_data["laRetrieval"] = {"create": {
            "emotionTags": Json(la.get("emotionTags") or []),
            "eventTags": Json(la.get("eventTags") or []),
            "registerTags": Json(la.get("registerTags") or []),
            "discourseTags": Json(la.get("discourseTags") or []),
            "socialTags": Json(la.get("socialTags") or [])
        }}

    fig = ev.get("figurative", {})
    if fig and fig.get("figureType"):
        event_data["figurative"] = {"create": {
            "isFigurative": True,
            "figureType": fig.get("figureType", ""),
            "sourceDomain": fig.get("sourceDomain"),
            "targetDomain": fig.get("targetDomain"),
            "literalMeaning": fig.get("literalMeaning"),
            "intendedMeaning": fig.get("intendedMeaning"),
            "transferability": fig.get("transferability"),
            "translationNote": fig.get("translationNote")
        }}

    if ev.get("keyTerms"):
        term_creates = []
        for kt in ev["keyTerms"]:
            term_creates.append({
                "termId": kt.get("termId", ""),
                "sourceLemma": kt.get("sourceLemma", ""),
                "semanticDomain": kt.get("semanticDomain", ""),
                "consistency": kt.get("consistency", "flexible")
            })
        if term_creates:
            event_data["keyTerms"] = {"create": term_creates}
    
    return event_data, event_id_str


async def _save_event_roles(
    db: Prisma,
    ev: Dict[str, Any], 
    event_db_id: str, 
    participant_id_map: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Save event roles to database.
    
    Args:
        db: Prisma database client.
        ev: The event data containing roles.
        event_db_id: The database ID of the event.
        participant_id_map: Mapping from participant ID to DB ID.
        
    Returns:
        List of created role dictionaries.
    """
    created_roles = []
    
    if ev.get("roles"):
        for role in ev["roles"]:
            p_id = participant_id_map.get(role.get("participantId"))
            if p_id:
                role_created = await db.eventrole.create(
                    data={
                        "event": {"connect": {"id": event_db_id}},
                        "role": role.get("role", "doer"),
                        "participant": {"connect": {"id": p_id}}
                    },
                    include={"participant": True}
                )
                created_roles.append({
                    "role": role_created.role,
                    "participantId": p_id
                })
    
    return created_roles


def _build_event_response(created: Any, passage_id: str, created_roles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build event response dictionary from created event.
    
    Args:
        created: The created event from database.
        passage_id: The passage ID.
        created_roles: List of created roles.
        
    Returns:
        Event response dictionary.
    """
    return {
        "id": created.id,
        "eventId": created.eventId,
        "clauseId": created.clauseId,
        "category": created.category,
        "eventCore": created.eventCore,
        "discourseFunction": created.discourseFunction,
        "chainPosition": created.chainPosition,
        "narrativeFunction": created.narrativeFunction,
        "passageId": passage_id,
        "roles": created_roles,
        "modifiers": {
            "happened": created.modifiers.happened if created.modifiers else None,
            "realness": created.modifiers.realness if created.modifiers else None,
            "when": created.modifiers.when if created.modifiers else None,
            "viewpoint": created.modifiers.viewpoint if created.modifiers else None,
            "phase": created.modifiers.phase if created.modifiers else None,
            "repetition": created.modifiers.repetition if created.modifiers else None,
            "onPurpose": created.modifiers.onPurpose if created.modifiers else None,
            "howKnown": created.modifiers.howKnown if created.modifiers else None,
            "causation": created.modifiers.causation if created.modifiers else None,
        } if created.modifiers else None,
        "pragmatic": {
            "register": created.pragmatic.discourseRegister if created.pragmatic else None,
            "socialAxis": created.pragmatic.socialAxis if created.pragmatic else None,
            "prominence": created.pragmatic.prominence if created.pragmatic else None,
            "pacing": created.pragmatic.pacing if created.pragmatic else None,
        } if created.pragmatic else None,
        "speechAct": (created.speechAct.model_dump() if hasattr(created.speechAct, 'model_dump') else created.speechAct.dict()) if created.speechAct else None,
        "emotions": [(e.model_dump() if hasattr(e, 'model_dump') else e.dict()) for e in created.emotions] if created.emotions else None,
        "narratorStance": (created.narratorStance.model_dump() if hasattr(created.narratorStance, 'model_dump') else created.narratorStance.dict()) if created.narratorStance else None,
        "audienceResponse": (created.audienceResponse.model_dump() if hasattr(created.audienceResponse, 'model_dump') else created.audienceResponse.dict()) if created.audienceResponse else None,
        "laRetrieval": (created.laRetrieval.model_dump() if hasattr(created.laRetrieval, 'model_dump') else created.laRetrieval.dict()) if created.laRetrieval else None,
        "figurative": (created.figurative.model_dump() if hasattr(created.figurative, 'model_dump') else created.figurative.dict()) if created.figurative else None,
        "keyTerms": [(kt.model_dump() if hasattr(kt, 'model_dump') else kt.dict()) for kt in created.keyTerms] if created.keyTerms else None,
    }


async def _inject_display_units(passage: Any, passage_data: Dict[str, Any], AIService: Any) -> Dict[str, Any]:
    """
    Inject display units into passage data for event alignment.
    
    Args:
        passage: The passage object from database.
        passage_data: The passage data dictionary.
        AIService: The AI service class.
        
    Returns:
        Updated passage data with display_units.
    """
    stored_units = passage.displayUnits if passage and getattr(passage, 'displayUnits', None) else None
    if stored_units:
        passage_data["display_units"] = stored_units
    else:
        try:
            # display_units = await AIService.suggest_clause_merges(passage_data)
            # passage_data["display_units"] = display_units
            
            # Disable AI grouping - force 1-to-1 mapping
            clauses = passage_data.get("clauses", [])
            display_units = [{"clause_ids": [c.get("clause_id")], "merged": False} for c in clauses if c.get("clause_id")]
            passage_data["display_units"] = display_units
            
        except Exception as e:
            print(f"Clause merge failed: {e}, using raw clauses")
    
    return passage_data
