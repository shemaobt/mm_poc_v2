"""
AI Integration API Router
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os

from app.core.database import get_db

router = APIRouter()


class AIPrefillRequest(BaseModel):
    """Request for AI prefill"""
    passage_ref: str
    api_key: str | None = None


class AIAnalysisRequest(BaseModel):
    """Request for AI analysis/translation"""
    reference: str

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
    except Exception as e:
        print(f"AI prefill error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/phase1")
async def analyze_phase1(request: AIPrefillRequest):
    """
    Phase 1: Participants & Relations Response
    """
    api_key = request.api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key required")
    
    try:
        from app.services.bhsa_service import get_bhsa_service, parse_reference
        from app.services.ai_service import AIService
        
        # 1. Get Passage Data
        book, chapter, start_verse, end_verse = parse_reference(request.passage_ref)
        bhsa_service = get_bhsa_service()
        passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
        
        # 2. Call AI Phase 1
        analysis = await AIService.analyze_participants(passage_data, api_key)
        
        # 3. Save (Clearing only participants/relations implies clearing everything dependent on them too)
        # For Phase 1, we treat it as a fresh start for the passage's semantic layer
        db = get_db()
        passage = await db.passage.find_unique(where={"reference": request.passage_ref})
        if not passage:
             raise HTTPException(status_code=404, detail="Passage not found")

        # Save Phase 1 (Clear all first to be safe, or just parts? Clear all is safer for Phase 1 start)
        await _clear_ai_data(db, passage.id, clear_all=True)
        saved_data = await _save_phase1_data(db, passage.id, analysis)
        
        return {"status": "success", "data": saved_data}

    except Exception as e:
        print(f"Phase 1 Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/phase2")
async def analyze_phase2(request: AIPrefillRequest):
    """
    Phase 2: Events & Discourse (Requires Phase 1 data in DB)
    """
    api_key = request.api_key or os.getenv("ANTHROPIC_API_KEY")
    try:
        from app.services.bhsa_service import get_bhsa_service, parse_reference
        from app.services.ai_service import AIService
        import json
        
        # 1. Get Passage Data
        book, chapter, start_verse, end_verse = parse_reference(request.passage_ref)
        bhsa_service = get_bhsa_service()
        passage_data = bhsa_service.extract_passage(book, chapter, start_verse, end_verse)
        
        db = get_db()
        passage = await db.passage.find_unique(where={"reference": request.passage_ref})
        if not passage:
             raise HTTPException(status_code=404, detail="Passage not found")
             
        # 2. Build Context from DB Participants
        # We fetch what we just saved in Phase 1 to ensure AI sees exactly what is persisted
        db_participants = await db.participant.find_many(
            where={"passageId": passage.id}
        )
        
        if not db_participants:
            raise HTTPException(status_code=400, detail="No participants found. Run Phase 1 first.")
            
        participants_context_list = [{
            "participantId": p.participantId,
            "hebrew": p.hebrew,
            "gloss": p.gloss,
            "type": p.type,
            "quantity": p.quantity,
            "referenceStatus": p.referenceStatus,
            "properties": p.properties
        } for p in db_participants]
        
        participants_context = json.dumps(participants_context_list, indent=2, ensure_ascii=False)
        
        # 3. Call AI Phase 2
        analysis = await AIService.analyze_events(passage_data, participants_context, api_key)
        
        # 4. Save Phase 2 (Clear events/discourse only)
        await _clear_ai_data(db, passage.id, clear_events_only=True)
        saved_data = await _save_phase2_data(db, passage.id, analysis)
        
        # Finalize
        from datetime import datetime
        await db.passage.update(
            where={"id": passage.id},
            data={"isComplete": True, "completedAt": datetime.now()}
        )
        
        return {"status": "success", "data": saved_data}

    except Exception as e:
        print(f"Phase 2 Error: {e}")
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


async def _clear_ai_data(db, passage_id: str, clear_all: bool = False, clear_events_only: bool = False):
    """Clear AI data based on scope"""
    try:
        if clear_all:
            # Delete everything in dependency order
            await db.discourserelation.delete_many(where={"passageId": passage_id})
            await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventmodifier.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventemotion.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventpragmatic.delete_many(where={"event": {"passageId": passage_id}})
            await db.event.delete_many(where={"passageId": passage_id})
            await db.participantrelation.delete_many(where={"passageId": passage_id})
            await db.participant.delete_many(where={"passageId": passage_id})
        elif clear_events_only:
            # Delete only events and discourse
            await db.discourserelation.delete_many(where={"passageId": passage_id})
            await db.eventrole.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventmodifier.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventemotion.delete_many(where={"event": {"passageId": passage_id}})
            await db.eventpragmatic.delete_many(where={"event": {"passageId": passage_id}})
            await db.event.delete_many(where={"passageId": passage_id})
            
    except Exception as e:
        print(f"Error clearing data: {e}")

async def _save_phase1_data(db, passage_id: str, analysis: dict) -> dict:
    """Save Phase 1: Participants & Relations"""
    from prisma import Json
    
    saved_participants = []
    saved_relations = []
    participant_id_map = {}
    
    # 1. Save Participants
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
                saved_participants.append(created.dict())
            except Exception as e:
                print(f"Error saving participant: {e}")

    # 2. Save Participant Relations
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
                    saved_relations.append(created.dict())
            except Exception as e:
                print(f"Error saving relation: {e}")
                
    return {"participants": saved_participants, "relations": saved_relations}

async def _save_phase2_data(db, passage_id: str, analysis: dict) -> dict:
    """Save Phase 2: Events & Discourse"""
    from prisma import Json
    
    # Need to fetch participants to Map IDs for roles
    db_participants = await db.participant.find_many(where={"passageId": passage_id})
    participant_id_map = {p.participantId: p.id for p in db_participants}
    
    # Fetch clauses for linking (map logic: clauseIndex + 1 -> db_id)
    db_clauses = await db.clause.find_many(where={"passageId": passage_id}, order={"clauseIndex": "asc"})
    clause_map = {str(c.clauseIndex + 1): c.id for c in db_clauses}
    print(f"[Debug] Clause Map for {passage_id}: {clause_map}")

    saved_events = []
    saved_discourse = []
    event_id_map = {}
    
    # 1. Save Events
    if analysis.get("events"):
        for ev in analysis["events"]:
            try:
                ai_clause_id = str(ev.get("clauseId", ""))
                db_clause_id = clause_map.get(ai_clause_id)
                print(f"[Debug] Linking Event {ev.get('eventId')} (clauseId={ai_clause_id}) -> DB Clause {db_clause_id}")
                
                event_data = {
                    "passage": {"connect": {"id": passage_id}},
                    "eventId": ev.get("eventId", ev.get("id", "")),
                    "category": ev.get("category", "ACTION"),
                    "eventCore": ev.get("eventCore", ev.get("event_core", "")),
                    "discourseFunction": ev.get("discourseFunction"),
                    "chainPosition": ev.get("chainPosition"),
                    "narrativeFunction": ev.get("narrativeFunction"),
                }
                
                if db_clause_id:
                    event_data["clause"] = {"connect": {"id": db_clause_id}}

                # Add sub-models (modifiers, pragmatic, etc) - SIMPLIFIED for brevity but keep essential
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
                    
                # Save Emotions
                if ev.get("emotions"):
                    emotion_creates = []
                    for emo in ev["emotions"]:
                        primary_val = emo.get("primary")
                        if not primary_val:
                            continue # Skip invalid emotions without primary type
                            
                        emo_data = {
                            "primary": primary_val,
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

                # Save Narrator Stance
                ns = ev.get("narratorStance", {})
                if ns and ns.get("stance"):
                    event_data["narratorStance"] = {"create": {"stance": ns.get("stance")}}

                # Save Audience Response
                ar = ev.get("audienceResponse", {})
                if ar and ar.get("response"):
                    event_data["audienceResponse"] = {"create": {"response": ar.get("response")}}

                # Save LA Retrieval
                la = ev.get("laRetrieval", {}) # Support both keys
                if not la: la = ev.get("laTags", {})
                
                if la and any(la.values()):
                    event_data["laRetrieval"] = {"create": {
                        "emotionTags": Json(la.get("emotionTags") or []),
                        "eventTags": Json(la.get("eventTags") or []),
                        "registerTags": Json(la.get("registerTags") or []),
                        "discourseTags": Json(la.get("discourseTags") or []),
                        "socialTags": Json(la.get("socialTags") or [])
                    }}

                # Save Figurative
                fig = ev.get("figurative", {})
                if fig:
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

                # Save Key Terms
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
                event_id_map[ev.get("eventId", ev.get("id", ""))] = created.id
                
                # 2. Save Roles
                created_roles = []
                if ev.get("roles"):
                    for role in ev["roles"]:
                        p_id = participant_id_map.get(role.get("participantId"))
                        if p_id:
                            role_created = await db.eventrole.create(
                                data={
                                    "event": {"connect": {"id": created.id}},
                                    "role": role.get("role", "doer"),
                                    "participant": {"connect": {"id": p_id}}
                                },
                                include={"participant": True}
                            )
                            created_roles.append({
                                "role": role_created.role,
                                "participantId": p_id
                            })

                # Build complete event response with all sub-models
                event_response = {
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
                    "speechAct": created.speechAct.dict() if created.speechAct else None,
                    "emotions": [e.dict() for e in created.emotions] if created.emotions else None,
                    "narratorStance": created.narratorStance.dict() if created.narratorStance else None,
                    "audienceResponse": created.audienceResponse.dict() if created.audienceResponse else None,
                    "laRetrieval": created.laRetrieval.dict() if created.laRetrieval else None,
                    "figurative": created.figurative.dict() if created.figurative else None,
                    "keyTerms": [kt.dict() for kt in created.keyTerms] if created.keyTerms else None,
                }
                saved_events.append(event_response)
            except Exception as e:
                print(f"Error saving event: {e}")

    # 3. Save Discourse Relations
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
                    saved_discourse.append(created.dict())
            except Exception as e:
                print(f"Error saving discourse: {e}")

    return {"events": saved_events, "discourse": saved_discourse}

async def _save_ai_analysis(db, passage_id: str, analysis: dict) -> dict:
    """Wrapper for backward compatibility"""
    # ... deprecated ...
    await _clear_ai_data(db, passage_id, clear_all=True)
    p1 = await _save_phase1_data(db, passage_id, analysis)
    p2 = await _save_phase2_data(db, passage_id, analysis)
    return {**p1, **p2}


    return {
        "participants": saved_participants,
        "events": saved_events,
        "relations": saved_relations,
        "discourse": saved_discourse,
    }


@router.post("/translate_clauses")
async def translate_clauses(
    request: AIAnalysisRequest,
    db = Depends(get_db)
):
    """
    Generate free translations for all clauses in a passage.
    """
    from prisma import Prisma
    from app.services.ai_service import AIService
    
    try:
        # 1. Fetch passage and clauses
        passage = await db.passage.find_unique(
            where={"reference": request.reference},
            include={"clauses": True}
        )
        
        if not passage:
            raise HTTPException(status_code=404, detail="Passage not found")
            
        passage_data = passage.dict()
        
        # 2. Check for existing translations
        existing_translations = {}
        all_translated = True
        
        for c in passage.clauses:
            if c.freeTranslation:
                existing_translations[str(c.clauseIndex + 1)] = c.freeTranslation
            else:
                all_translated = False
        
        if all_translated and len(passage.clauses) > 0:
            print(f"[AI] Skipping generation. Found {len(existing_translations)} existing translations.")
            return {
                "message": "Retrieved from database (cached)", 
                "updated_count": 0, 
                "translations": existing_translations
            }

        # 3. Call AI Service (if needed)
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="ID not configured (ANTHROPIC_API_KEY missing)")
            
        translations = await AIService.translate_clauses(passage_data, api_key)
        
        # 3. Update clauses in DB
        updated_count = 0
        for clause_id_str, translation in translations.items():
            try:
                c_id = int(clause_id_str)
                # Find clause where clauseIndex+1 matches the ID returned by AI
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

    except Exception as e:
        print(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_ai_models():
    """List available AI models"""
    return {
        "models": [
            {"id": "claude", "name": "Claude (Anthropic)"},
            {"id": "gemini", "name": "Gemini (Google)"}
        ]
    }
