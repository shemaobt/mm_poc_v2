from datetime import datetime
from typing import Dict, Any, List, Optional

from prisma import Json, Prisma

from app.core.config import get_settings


class APIKeyNotConfiguredError(Exception):
    """Raised when ANTHROPIC_API_KEY is not configured."""
    pass


class PassageNotFoundError(Exception):
    """Raised when a passage cannot be found."""
    pass


class InvalidReferenceError(Exception):
    """Raised when a reference cannot be parsed."""
    pass


async def prefill_passage(db: Prisma, passage_ref: str) -> Dict[str, Any]:
    """
    AI prefill all fields for a passage - generates analysis and saves to database.
    
    Args:
        db: The Prisma database client.
        passage_ref: The passage reference (e.g., "Ruth 1:1-6").
        
    Returns:
        A dictionary with status and saved data.
        
    Raises:
        APIKeyNotConfiguredError: If no API key is available.
        InvalidReferenceError: If the reference cannot be parsed.
        PassageNotFoundError: If the passage doesn't exist in database.
    """
    api_key = get_settings().anthropic_api_key
    if not api_key:
        raise APIKeyNotConfiguredError("API Key required (not found in request or environment)")
    
    from app.services.bhsa_service import get_bhsa_service, parse_reference
    
    try:
        book, chapter, start_verse, end_verse = parse_reference(passage_ref)
    except ValueError as e:
        raise InvalidReferenceError(str(e))

    bhsa_service = get_bhsa_service()
    passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
    
    if not passage_data:
        raise PassageNotFoundError("Passage not found in BHSA")

    from app.services.ai_service import AIService
    analysis = await AIService.analyze_passage(passage_data, api_key)
    
    passage = await db.passage.find_unique(where={"reference": passage_ref})
    
    if not passage:
        raise PassageNotFoundError(f"Passage not found in database: {passage_ref}")
    
    saved_data = await save_ai_analysis(db, passage.id, analysis)
    await create_metrics_snapshot(db, passage.id, analysis)
    
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


async def translate_clauses(db: Prisma, reference: str) -> Dict[str, Any]:
    """
    Generate free translations for all clauses in a passage.
    
    Args:
        db: The Prisma database client.
        reference: The passage reference.
        
    Returns:
        A dictionary with message, updated_count, and translations.
        
    Raises:
        PassageNotFoundError: If the passage doesn't exist.
        APIKeyNotConfiguredError: If no API key is available.
    """
    passage = await db.passage.find_unique(
        where={"reference": reference},
        include={"clauses": True}
    )
    
    if not passage:
        raise PassageNotFoundError("Passage not found")
        
    passage_data = passage.model_dump() if hasattr(passage, 'model_dump') else passage.dict()
    
    existing_translations = {}
    all_translated = True
    
    for c in passage.clauses:
        if c.freeTranslation:
            existing_translations[str(c.clauseIndex + 1)] = c.freeTranslation
        else:
            all_translated = False
    
    if all_translated and len(passage.clauses) > 0:
        return {
            "message": "Retrieved from database (cached)", 
            "updated_count": 0, 
            "translations": existing_translations
        }

    api_key = get_settings().anthropic_api_key
    if not api_key:
        raise APIKeyNotConfiguredError("ANTHROPIC_API_KEY not configured")
    
    from app.services.ai_service import AIService
    translations = await AIService.translate_clauses(passage_data, api_key)
    
    updated_count = 0
    for clause_id_str, translation in translations.items():
        try:
            c_id = int(clause_id_str)
            target_clause = next((c for c in passage.clauses if (c.clauseIndex + 1) == c_id), None)
            
            if target_clause:
                await db.clause.update(
                    where={"id": target_clause.id},
                    data={"freeTranslation": translation}
                )
                updated_count += 1
        except ValueError:
            continue
            
    return {"message": "Translation complete", "updated_count": updated_count, "translations": translations}


async def create_metrics_snapshot(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Optional[str]:
    """
    Create a metrics snapshot for AI tracking.
    
    Args:
        db: The Prisma database client.
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


async def clear_ai_data(
    db: Prisma,
    passage_id: str, 
    clear_all: bool = False, 
    clear_events_only: bool = False
) -> None:
    """
    Clear AI-generated data for a passage.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        clear_all: If True, clear all AI data.
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
        db: The Prisma database client.
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


async def save_ai_analysis(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Dict[str, List[Any]]:
    """
    Save complete AI analysis to database.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        analysis: The complete AI analysis.
        
    Returns:
        A dictionary with all saved data.
    """
    await clear_ai_data(db, passage_id, clear_all=True)
    p1 = await save_phase1_data(db, passage_id, analysis)
    p2 = await save_phase2_data(db, passage_id, analysis)
    return {**p1, **p2}


async def save_phase2_data(db: Prisma, passage_id: str, analysis: Dict[str, Any]) -> Dict[str, List[Any]]:
    """
    Save Phase 2 data: Events and Discourse relations.
    
    Args:
        db: The Prisma database client.
        passage_id: The ID of the passage.
        analysis: The AI analysis containing events and discourse.
        
    Returns:
        A dictionary with saved events and discourse relations.
    """
    db_participants = await db.participant.find_many(where={"passageId": passage_id})
    participant_id_map = {p.participantId: p.id for p in db_participants}
    
    db_clauses = await db.clause.find_many(where={"passageId": passage_id}, order={"clauseIndex": "asc"})
    clause_map = {str(c.clauseIndex + 1): c.id for c in db_clauses}

    saved_events = []
    saved_discourse = []
    event_id_map = {}
    
    events = analysis.get("events", [])
    for ev in events:
        try:
            event_id = ev.get("eventId", ev.get("id", ""))
            clause_id = ev.get("clauseId")
            clause_db_id = clause_map.get(str(clause_id)) if clause_id else None
            
            event_data: Dict[str, Any] = {
                "passage": {"connect": {"id": passage_id}},
                "eventId": event_id,
                "category": ev.get("category", ""),
                "eventCore": ev.get("eventCore", ""),
                "discourseFunction": ev.get("discourseFunction"),
                "chainPosition": ev.get("chainPosition"),
                "narrativeFunction": ev.get("narrativeFunction"),
            }
            
            if clause_db_id:
                event_data["clause"] = {"connect": {"id": clause_db_id}}
            
            created = await db.event.create(data=event_data)
            event_id_map[event_id] = created.id
            
            roles = ev.get("roles", [])
            for role in roles:
                role_data: Dict[str, Any] = {
                    "event": {"connect": {"id": created.id}},
                    "role": role.get("role", ""),
                }
                pid = role.get("participantId")
                if pid and pid in participant_id_map:
                    role_data["participant"] = {"connect": {"id": participant_id_map[pid]}}
                await db.eventrole.create(data=role_data)
            
            saved_events.append(created.model_dump() if hasattr(created, 'model_dump') else created.dict())
            
        except Exception as e:
            print(f"Error saving event: {e}")
    
    discourse = analysis.get("discourse", [])
    for disc in discourse:
        try:
            source_id = disc.get("sourceId")
            target_id = disc.get("targetId")
            source_db_id = event_id_map.get(source_id)
            target_db_id = event_id_map.get(target_id)
            
            if source_db_id and target_db_id:
                created = await db.discourserelation.create(
                    data={
                        "passageId": passage_id,
                        "type": disc.get("type", disc.get("relationType", "")),
                        "source": {"connect": {"id": source_db_id}},
                        "target": {"connect": {"id": target_db_id}},
                    }
                )
                saved_discourse.append(created.model_dump() if hasattr(created, 'model_dump') else created.dict())
        except Exception as e:
            print(f"Error saving discourse: {e}")
    
    return {"events": saved_events, "discourse": saved_discourse}


def list_ai_models() -> Dict[str, List[Dict[str, str]]]:
    """
    List available AI models.
    
    Returns:
        A dictionary with available models.
    """
    return {
        "models": [
            {"id": "claude", "name": "Claude (Anthropic)"},
            {"id": "gemini", "name": "Gemini (Google)"}
        ]
    }
