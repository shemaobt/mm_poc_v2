"""
Event Service
Business logic for managing events with all sub-models
"""
from typing import List, Dict, Any, Optional
from prisma import Json
from app.core.database import db
from app.models.schemas import EventCreate


class EventService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict]:
        """Get all events for a passage with all related data"""
        events = await db.event.find_many(
            where={"passageId": passage_id},
            include={
                "roles": {
                    "include": {"participant": True}
                },
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "emotions": True,
                "narratorStance": True,
                "audienceResponse": True,
                "laRetrieval": True,
                "figurative": True,
                "keyTerms": True,
                "clause": True
            },
            # order={"eventId": "asc"} # Removed DB sorting to use natural sort in Python
        )
        
        # Natural sort helper
        def natural_sort_key(ev):
            # Sort by number in e<number>
            s = ev.eventId
            if s.startswith('e') and s[1:].isdigit():
                return (0, int(s[1:]))
            return (1, s)

        # Sort events
        events.sort(key=natural_sort_key)
        
        # Transform to match frontend expectations
        result = [await EventService._transform_event(ev, passage_id) for ev in events]
        
        return result

    @staticmethod
    async def create(passage_id: str, data: EventCreate) -> Dict:
        """Create a new event with all sub-models"""
        # Check if exists
        existing = await db.event.find_unique(
            where={
                "passageId_eventId": {
                    "passageId": passage_id,
                    "eventId": data.eventId
                }
            }
        )
        
        if existing:
            return await EventService.update(existing.id, data)

        # Build base event data
        event_data: Dict[str, Any] = {
            "passage": {"connect": {"id": passage_id}},
            "eventId": data.eventId,
            "category": data.category,
            "eventCore": data.eventCore,
            "discourseFunction": data.discourseFunction,
            "chainPosition": data.chainPosition,
            "narrativeFunction": data.narrativeFunction,
        }
        
        if data.clauseId:
            event_data["clause"] = {"connect": {"id": data.clauseId}}
        
        # Add roles (including N/A participant: schema allows participantId null)
        if data.roles:
            role_creates = []
            for r in data.roles:
                role_data: Dict[str, Any] = {"role": r.role or ""}
                if r.participantId:
                    participant = await db.participant.find_first(
                        where={"passageId": passage_id, "participantId": r.participantId}
                    )
                    if participant:
                        role_data["participant"] = {"connect": {"id": participant.id}}
                role_creates.append(role_data)
            if role_creates:
                event_data["roles"] = {"create": role_creates}
        
        # Add modifiers
        if data.modifiers and any([
            data.modifiers.happened, data.modifiers.realness, data.modifiers.when,
            data.modifiers.viewpoint, data.modifiers.phase, data.modifiers.repetition,
            data.modifiers.onPurpose, data.modifiers.howKnown, data.modifiers.causation
        ]):
            event_data["modifiers"] = {"create": {
                "happened": data.modifiers.happened,
                "realness": data.modifiers.realness,
                "when": data.modifiers.when,
                "viewpoint": data.modifiers.viewpoint,
                "phase": data.modifiers.phase,
                "repetition": data.modifiers.repetition,
                "onPurpose": data.modifiers.onPurpose,
                "howKnown": data.modifiers.howKnown,
                "causation": data.modifiers.causation,
            }}
        
        # Add speech act
        if data.speechAct and (data.speechAct.type or data.speechAct.quotationType):
            event_data["speechAct"] = {"create": {
                "type": data.speechAct.type or "",
                "quotationType": data.speechAct.quotationType,
            }}
        
        # Add pragmatic
        if data.pragmatic and any([
            data.pragmatic.register, data.pragmatic.socialAxis,
            data.pragmatic.prominence, data.pragmatic.pacing
        ]):
            event_data["pragmatic"] = {"create": {
                "discourseRegister": data.pragmatic.register,
                "socialAxis": data.pragmatic.socialAxis,
                "prominence": data.pragmatic.prominence,
                "pacing": data.pragmatic.pacing,
            }}
        
        # Add emotions (use participantId scalar only; nested create rejects participant relation)
        if data.emotions:
            emotion_creates = []
            for emo in data.emotions:
                emo_data: Dict[str, Any] = {
                    "primary": emo.primary,
                    "secondary": emo.secondary,
                    "intensity": emo.intensity,
                    "source": emo.source,
                    "confidence": emo.confidence,
                    "notes": emo.notes,
                }
                if emo.participantId:
                    participant = await db.participant.find_first(
                        where={"passageId": passage_id, "participantId": emo.participantId}
                    )
                    if participant:
                        emo_data["participantId"] = participant.id
                emotion_creates.append(emo_data)
            if emotion_creates:
                event_data["emotions"] = {"create": emotion_creates}
        
        # Add narrator stance
        if data.narratorStance and data.narratorStance.stance:
            event_data["narratorStance"] = {"create": {"stance": data.narratorStance.stance}}
        
        # Add audience response
        if data.audienceResponse and data.audienceResponse.response:
            event_data["audienceResponse"] = {"create": {"response": data.audienceResponse.response}}
        
        # Add LA retrieval
        if data.laRetrieval and any([
            data.laRetrieval.emotionTags, data.laRetrieval.eventTags,
            data.laRetrieval.registerTags, data.laRetrieval.discourseTags,
            data.laRetrieval.socialTags
        ]):
            event_data["laRetrieval"] = {"create": {
                "emotionTags": Json(data.laRetrieval.emotionTags or []),
                "eventTags": Json(data.laRetrieval.eventTags or []),
                "registerTags": Json(data.laRetrieval.registerTags or []),
                "discourseTags": Json(data.laRetrieval.discourseTags or []),
                "socialTags": Json(data.laRetrieval.socialTags or []),
            }}
        
        # Add figurative
        if data.figurative and data.figurative.isFigurative:
            event_data["figurative"] = {"create": {
                "isFigurative": data.figurative.isFigurative,
                "figureType": data.figurative.figureType or "",
                "sourceDomain": data.figurative.sourceDomain,
                "targetDomain": data.figurative.targetDomain,
                "literalMeaning": data.figurative.literalMeaning,
                "intendedMeaning": data.figurative.intendedMeaning,
                "transferability": data.figurative.transferability,
                "translationNote": data.figurative.translationNote,
            }}
        
        # Add key terms
        if data.keyTerms:
            term_creates = [{
                "termId": kt.termId,
                "sourceLemma": kt.sourceLemma,
                "semanticDomain": kt.semanticDomain,
                "consistency": kt.consistency,
            } for kt in data.keyTerms]
            event_data["keyTerms"] = {"create": term_creates}
        
        # Create the event
        event = await db.event.create(
            data=event_data,
            include={
                "roles": True,
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "emotions": True,
                "narratorStance": True,
                "audienceResponse": True,
                "laRetrieval": True,
                "figurative": True,
                "keyTerms": True,
            }
        )
        
        # Get passage_id for returning transformed data
        return await EventService._transform_event(event, passage_id)

    @staticmethod
    async def update(id: str, data: EventCreate) -> Dict:
        """Update event and all its nested relations"""
        # Get current event to find passage_id and existing relations
        current = await db.event.find_unique(
            where={"id": id},
            include={
                "narratorStance": True,
                "audienceResponse": True,
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "figurative": True
            }
        )
        if not current:
            raise ValueError(f"Event {id} not found")
        
        passage_id = current.passageId
        
        # Build role creates (including N/A participant: schema allows participantId null)
        role_creates = []
        for r in (data.roles or []):
            role_data: Dict[str, Any] = {"role": r.role or ""}
            if r.participantId:
                participant = await db.participant.find_first(
                    where={"passageId": passage_id, "participantId": r.participantId}
                )
                if participant:
                    role_data["participant"] = {"connect": {"id": participant.id}}
            role_creates.append(role_data)

        # Build update data
        update_data: Dict[str, Any] = {
            "category": data.category,
            "eventCore": data.eventCore,
            "discourseFunction": data.discourseFunction,
            "chainPosition": data.chainPosition,
            "narrativeFunction": data.narrativeFunction,
            "roles": {
                "deleteMany": {},
                "create": role_creates,
            },
        }
        
        if data.clauseId:
            update_data["clauseId"] = data.clauseId
        
        # Update modifiers (upsert pattern)
        if data.modifiers:
            update_data["modifiers"] = {
                "upsert": {
                    "create": {
                        "happened": data.modifiers.happened,
                        "realness": data.modifiers.realness,
                        "when": data.modifiers.when,
                        "viewpoint": data.modifiers.viewpoint,
                        "phase": data.modifiers.phase,
                        "repetition": data.modifiers.repetition,
                        "onPurpose": data.modifiers.onPurpose,
                        "howKnown": data.modifiers.howKnown,
                        "causation": data.modifiers.causation,
                    },
                    "update": {
                        "happened": data.modifiers.happened,
                        "realness": data.modifiers.realness,
                        "when": data.modifiers.when,
                        "viewpoint": data.modifiers.viewpoint,
                        "phase": data.modifiers.phase,
                        "repetition": data.modifiers.repetition,
                        "onPurpose": data.modifiers.onPurpose,
                        "howKnown": data.modifiers.howKnown,
                        "causation": data.modifiers.causation,
                    }
                }
            }
        
        # Update speech act (always update if speechAct data is provided, even with empty values for N/A)
        if data.speechAct is not None:
            update_data["speechAct"] = {
                "upsert": {
                    "create": {
                        "type": data.speechAct.type if data.speechAct.type else "",
                        "quotationType": data.speechAct.quotationType if data.speechAct.quotationType else "",
                    },
                    "update": {
                        "type": data.speechAct.type if data.speechAct.type else "",
                        "quotationType": data.speechAct.quotationType if data.speechAct.quotationType else "",
                    }
                }
            }
        
        # Update pragmatic
        if data.pragmatic:
            update_data["pragmatic"] = {
                "upsert": {
                    "create": {
                        "discourseRegister": data.pragmatic.register,
                        "socialAxis": data.pragmatic.socialAxis,
                        "prominence": data.pragmatic.prominence,
                        "pacing": data.pragmatic.pacing,
                    },
                    "update": {
                        "discourseRegister": data.pragmatic.register,
                        "socialAxis": data.pragmatic.socialAxis,
                        "prominence": data.pragmatic.prominence,
                        "pacing": data.pragmatic.pacing,
                    }
                }
            }
        
        # Update emotions (delete all and recreate; use participantId scalar only for nested create)
        if data.emotions is not None:
            emotion_creates = []
            for emo in data.emotions:
                emo_data: Dict[str, Any] = {
                    "primary": emo.primary,
                    "secondary": emo.secondary,
                    "intensity": emo.intensity,
                    "source": emo.source,
                    "confidence": emo.confidence,
                    "notes": emo.notes,
                }
                if emo.participantId:
                    participant = await db.participant.find_first(
                        where={"passageId": passage_id, "participantId": emo.participantId}
                    )
                    if participant:
                        emo_data["participantId"] = participant.id
                emotion_creates.append(emo_data)
            update_data["emotions"] = {
                "deleteMany": {},
                "create": emotion_creates,
            }
        
        # Update narrator stance
        if data.narratorStance and data.narratorStance.stance:
            update_data["narratorStance"] = {
                "upsert": {
                    "create": {"stance": data.narratorStance.stance},
                    "update": {"stance": data.narratorStance.stance}
                }
            }
        elif data.narratorStance and current.narratorStance: # Only delete if exists
             update_data["narratorStance"] = {"delete": True}
        
        # Update audience response
        if data.audienceResponse and data.audienceResponse.response:
            update_data["audienceResponse"] = {
                "upsert": {
                    "create": {"response": data.audienceResponse.response},
                    "update": {"response": data.audienceResponse.response}
                }
            }
        elif data.audienceResponse and current.audienceResponse: # Only delete if exists
             update_data["audienceResponse"] = {"delete": True}
        
        # Update LA retrieval
        if data.laRetrieval:
            update_data["laRetrieval"] = {
                "upsert": {
                    "create": {
                        "emotionTags": Json(data.laRetrieval.emotionTags or []),
                        "eventTags": Json(data.laRetrieval.eventTags or []),
                        "registerTags": Json(data.laRetrieval.registerTags or []),
                        "discourseTags": Json(data.laRetrieval.discourseTags or []),
                        "socialTags": Json(data.laRetrieval.socialTags or []),
                    },
                    "update": {
                        "emotionTags": Json(data.laRetrieval.emotionTags or []),
                        "eventTags": Json(data.laRetrieval.eventTags or []),
                        "registerTags": Json(data.laRetrieval.registerTags or []),
                        "discourseTags": Json(data.laRetrieval.discourseTags or []),
                        "socialTags": Json(data.laRetrieval.socialTags or []),
                    }
                }
            }
        
        # Update figurative
        if data.figurative:
            if data.figurative.isFigurative:
                update_data["figurative"] = {
                    "upsert": {
                        "create": {
                            "isFigurative": True,
                            "figureType": data.figurative.figureType or "",
                            "sourceDomain": data.figurative.sourceDomain,
                            "targetDomain": data.figurative.targetDomain,
                            "literalMeaning": data.figurative.literalMeaning,
                            "intendedMeaning": data.figurative.intendedMeaning,
                            "transferability": data.figurative.transferability,
                            "translationNote": data.figurative.translationNote,
                        },
                        "update": {
                            "isFigurative": True,
                            "figureType": data.figurative.figureType or "",
                            "sourceDomain": data.figurative.sourceDomain,
                            "targetDomain": data.figurative.targetDomain,
                            "literalMeaning": data.figurative.literalMeaning,
                            "intendedMeaning": data.figurative.intendedMeaning,
                            "transferability": data.figurative.transferability,
                            "translationNote": data.figurative.translationNote,
                        }
                    }
                }
            else:
                # Delete figurative if not figurative
                if current.figurative:
                    update_data["figurative"] = {"delete": True}
        
        # Update key terms (delete all and recreate)
        if data.keyTerms is not None:
            term_creates = [{
                "termId": kt.termId,
                "sourceLemma": kt.sourceLemma,
                "semanticDomain": kt.semanticDomain,
                "consistency": kt.consistency,
            } for kt in data.keyTerms]
            update_data["keyTerms"] = {
                "deleteMany": {},
                "create": term_creates,
            }
        
        # Perform the update (include participant on roles so _transform_event returns logical participantId for UI)
        event = await db.event.update(
            where={"id": id},
            data=update_data,
            include={
                "roles": {"include": {"participant": True}},
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "emotions": True,
                "narratorStance": True,
                "audienceResponse": True,
                "laRetrieval": True,
                "figurative": True,
                "keyTerms": True,
            }
        )
        
        return await EventService._transform_event(event, passage_id)

    @staticmethod
    async def _transform_event(event, passage_id: str) -> Dict:
        """Transform Prisma event to response format. Roles always use logical participantId (p1, p2) for UI."""
        roles_out = []
        for r in (event.roles or []):
            if r.participant:
                pid = r.participant.participantId
            elif r.participantId:
                part = await db.participant.find_unique(where={"id": r.participantId})
                pid = part.participantId if part else r.participantId
            else:
                pid = None
            roles_out.append({"role": r.role, "participantId": pid})
        ev_dict: Dict[str, Any] = {
            "id": event.id,
            "passageId": passage_id,
            "eventId": event.eventId,
            "clauseId": event.clauseId,
            "unitClauseIds": event.unitClauseIds if hasattr(event, 'unitClauseIds') and event.unitClauseIds else None,
            "category": event.category,
            "eventCore": event.eventCore,
            "discourseFunction": event.discourseFunction,
            "chainPosition": event.chainPosition,
            "narrativeFunction": event.narrativeFunction,
            "roles": roles_out,
        }
        
        if event.modifiers:
            ev_dict["modifiers"] = {
                "happened": event.modifiers.happened,
                "realness": event.modifiers.realness,
                "when": event.modifiers.when,
                "viewpoint": event.modifiers.viewpoint,
                "phase": event.modifiers.phase,
                "repetition": event.modifiers.repetition,
                "onPurpose": event.modifiers.onPurpose,
                "howKnown": event.modifiers.howKnown,
                "causation": event.modifiers.causation,
            }
        
        if event.speechAct:
            ev_dict["speechAct"] = {
                "type": event.speechAct.type,
                "quotationType": event.speechAct.quotationType,
            }
        
        if event.pragmatic:
            ev_dict["pragmatic"] = {
                "register": event.pragmatic.discourseRegister,
                "socialAxis": event.pragmatic.socialAxis,
                "prominence": event.pragmatic.prominence,
                "pacing": event.pragmatic.pacing,
            }
        
        if event.emotions:
            ev_dict["emotions"] = [{
                "id": e.id,
                "participantId": e.participantId,
                "primary": e.primary,
                "secondary": e.secondary,
                "intensity": e.intensity,
                "source": e.source,
                "confidence": e.confidence,
                "notes": e.notes,
            } for e in event.emotions]
        
        if event.narratorStance:
            ev_dict["narratorStance"] = {"stance": event.narratorStance.stance}
        
        if event.audienceResponse:
            ev_dict["audienceResponse"] = {"response": event.audienceResponse.response}
        
        if event.laRetrieval:
            ev_dict["laRetrieval"] = {
                "emotionTags": event.laRetrieval.emotionTags,
                "eventTags": event.laRetrieval.eventTags,
                "registerTags": event.laRetrieval.registerTags,
                "discourseTags": event.laRetrieval.discourseTags,
                "socialTags": event.laRetrieval.socialTags,
            }
        
        if event.figurative:
            ev_dict["figurative"] = {
                "isFigurative": event.figurative.isFigurative,
                "figureType": event.figurative.figureType,
                "sourceDomain": event.figurative.sourceDomain,
                "targetDomain": event.figurative.targetDomain,
                "literalMeaning": event.figurative.literalMeaning,
                "intendedMeaning": event.figurative.intendedMeaning,
                "transferability": event.figurative.transferability,
                "translationNote": event.figurative.translationNote,
            }
        
        if event.keyTerms:
            ev_dict["keyTerms"] = [{
                "id": kt.id,
                "termId": kt.termId,
                "sourceLemma": kt.sourceLemma,
                "semanticDomain": kt.semanticDomain,
                "consistency": kt.consistency,
            } for kt in event.keyTerms]
        
        return ev_dict

    @staticmethod
    async def patch(id: str, data) -> Dict:
        """
        Partial update event - only update fields that are provided in the delta.
        This is more efficient than full update when only changing a few fields.
        """
        from app.models.schemas import EventPatch
        
        # Get current event to find passage_id and for comparison
        current = await db.event.find_unique(
            where={"id": id},
            include={
                "clause": True,
                "roles": True,
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "emotions": True,
                "narratorStance": True,
                "audienceResponse": True,
                "laRetrieval": True,
                "figurative": True,
                "keyTerms": True
            }
        )
        if not current:
            raise ValueError(f"Event {id} not found")
        
        passage_id = current.passageId
        update_data: Dict[str, Any] = {}
        
        # Only update scalar fields if provided
        if data.category is not None:
            update_data["category"] = data.category
        if data.eventCore is not None:
            update_data["eventCore"] = data.eventCore
        if data.discourseFunction is not None:
            update_data["discourseFunction"] = data.discourseFunction
        if data.chainPosition is not None:
            update_data["chainPosition"] = data.chainPosition
        if data.narrativeFunction is not None:
            update_data["narrativeFunction"] = data.narrativeFunction
        # Note: clauseId is intentionally not updated in patch - it's a FK that requires full update
        
        # Only update roles if provided (including N/A participant: schema allows participantId null)
        if data.roles is not None:
            participant_ids = [r.participantId for r in data.roles if r.participantId]
            participants = await db.participant.find_many(
                where={
                    "passageId": passage_id,
                    "OR": [
                        {"id": {"in": participant_ids}},
                        {"participantId": {"in": participant_ids}}
                    ]
                }
            ) if participant_ids else []
            participant_map = {}
            for p in participants:
                participant_map[p.id] = p.id
                participant_map[p.participantId] = p.id
            role_creates = []
            for r in data.roles:
                role_data: Dict[str, Any] = {"role": r.role or ""}
                if r.participantId and r.participantId in participant_map:
                    role_data["participant"] = {"connect": {"id": participant_map[r.participantId]}}
                role_creates.append(role_data)
            update_data["roles"] = {
                "deleteMany": {},
                "create": role_creates,
            }
        
        # Only update modifiers if provided
        if data.modifiers is not None:
            update_data["modifiers"] = {
                "upsert": {
                    "create": {
                        "happened": data.modifiers.happened,
                        "realness": data.modifiers.realness,
                        "when": data.modifiers.when,
                        "viewpoint": data.modifiers.viewpoint,
                        "phase": data.modifiers.phase,
                        "repetition": data.modifiers.repetition,
                        "onPurpose": data.modifiers.onPurpose,
                        "howKnown": data.modifiers.howKnown,
                        "causation": data.modifiers.causation,
                    },
                    "update": {
                        "happened": data.modifiers.happened,
                        "realness": data.modifiers.realness,
                        "when": data.modifiers.when,
                        "viewpoint": data.modifiers.viewpoint,
                        "phase": data.modifiers.phase,
                        "repetition": data.modifiers.repetition,
                        "onPurpose": data.modifiers.onPurpose,
                        "howKnown": data.modifiers.howKnown,
                        "causation": data.modifiers.causation,
                    }
                }
            }
        
        # Only update speechAct if provided
        if data.speechAct is not None:
            update_data["speechAct"] = {
                "upsert": {
                    "create": {
                        "type": data.speechAct.type if data.speechAct.type else "",
                        "quotationType": data.speechAct.quotationType if data.speechAct.quotationType else "",
                    },
                    "update": {
                        "type": data.speechAct.type if data.speechAct.type else "",
                        "quotationType": data.speechAct.quotationType if data.speechAct.quotationType else "",
                    }
                }
            }
        
        # Only update pragmatic if provided
        if data.pragmatic is not None:
            update_data["pragmatic"] = {
                "upsert": {
                    "create": {
                        "discourseRegister": data.pragmatic.register,
                        "socialAxis": data.pragmatic.socialAxis,
                        "prominence": data.pragmatic.prominence,
                        "pacing": data.pragmatic.pacing,
                    },
                    "update": {
                        "discourseRegister": data.pragmatic.register,
                        "socialAxis": data.pragmatic.socialAxis,
                        "prominence": data.pragmatic.prominence,
                        "pacing": data.pragmatic.pacing,
                    }
                }
            }
        
        # Only update narratorStance if provided
        if data.narratorStance is not None:
            if data.narratorStance.stance:
                update_data["narratorStance"] = {
                    "upsert": {
                        "create": {"stance": data.narratorStance.stance},
                        "update": {"stance": data.narratorStance.stance}
                    }
                }
            elif current.narratorStance:
                update_data["narratorStance"] = {"delete": True}
        
        # Only update audienceResponse if provided
        if data.audienceResponse is not None:
            if data.audienceResponse.response:
                update_data["audienceResponse"] = {
                    "upsert": {
                        "create": {"response": data.audienceResponse.response},
                        "update": {"response": data.audienceResponse.response}
                    }
                }
            elif current.audienceResponse:
                update_data["audienceResponse"] = {"delete": True}
        
        # Only update laRetrieval if provided
        if data.laRetrieval is not None:
            update_data["laRetrieval"] = {
                "upsert": {
                    "create": {
                        "emotionTags": Json(data.laRetrieval.emotionTags or []),
                        "eventTags": Json(data.laRetrieval.eventTags or []),
                        "registerTags": Json(data.laRetrieval.registerTags or []),
                        "discourseTags": Json(data.laRetrieval.discourseTags or []),
                        "socialTags": Json(data.laRetrieval.socialTags or []),
                    },
                    "update": {
                        "emotionTags": Json(data.laRetrieval.emotionTags or []),
                        "eventTags": Json(data.laRetrieval.eventTags or []),
                        "registerTags": Json(data.laRetrieval.registerTags or []),
                        "discourseTags": Json(data.laRetrieval.discourseTags or []),
                        "socialTags": Json(data.laRetrieval.socialTags or []),
                    }
                }
            }
        
        # Only update figurative if provided
        if data.figurative is not None:
            if data.figurative.isFigurative:
                update_data["figurative"] = {
                    "upsert": {
                        "create": {
                            "isFigurative": True,
                            "figureType": data.figurative.figureType or "",
                            "sourceDomain": data.figurative.sourceDomain,
                            "targetDomain": data.figurative.targetDomain,
                            "literalMeaning": data.figurative.literalMeaning,
                            "intendedMeaning": data.figurative.intendedMeaning,
                            "transferability": data.figurative.transferability,
                            "translationNote": data.figurative.translationNote,
                        },
                        "update": {
                            "isFigurative": True,
                            "figureType": data.figurative.figureType or "",
                            "sourceDomain": data.figurative.sourceDomain,
                            "targetDomain": data.figurative.targetDomain,
                            "literalMeaning": data.figurative.literalMeaning,
                            "intendedMeaning": data.figurative.intendedMeaning,
                            "transferability": data.figurative.transferability,
                            "translationNote": data.figurative.translationNote,
                        }
                    }
                }
            elif current.figurative:
                update_data["figurative"] = {"delete": True}
        
        # Only update keyTerms if provided
        if data.keyTerms is not None:
            term_creates = [{
                "termId": kt.termId,
                "sourceLemma": kt.sourceLemma,
                "semanticDomain": kt.semanticDomain,
                "consistency": kt.consistency,
            } for kt in data.keyTerms]
            update_data["keyTerms"] = {
                "deleteMany": {},
                "create": term_creates,
            }
        
        # Only update emotions if provided
        if data.emotions is not None:
            # Get all participants for emotion links
            participant_ids = [e.participantId for e in data.emotions if e.participantId]
            participants = await db.participant.find_many(
                where={
                    "passageId": passage_id,
                    "participantId": {"in": participant_ids}
                }
            ) if participant_ids else []
            participant_map = {p.participantId: p.id for p in participants}
            
            emotion_creates = []
            for e in data.emotions:
                emotion_data: Dict[str, Any] = {
                    "primary": e.primary,
                    "secondary": e.secondary,
                    "intensity": e.intensity,
                    "source": e.source,
                    "confidence": e.confidence,
                    "notes": e.notes,
                }
                if e.participantId and e.participantId in participant_map:
                    emotion_data["participantId"] = participant_map[e.participantId]
                emotion_creates.append(emotion_data)
            
            update_data["emotions"] = {
                "deleteMany": {},
                "create": emotion_creates,
            }
        
        # Perform the update only if there's something to update
        if not update_data:
            # No changes, just return current data
            return await EventService._transform_event(current, passage_id)
        
        event = await db.event.update(
            where={"id": id},
            data=update_data,
            include={
                "clause": True,
                "roles": {"include": {"participant": True}},
                "modifiers": True,
                "speechAct": True,
                "pragmatic": True,
                "emotions": True,
                "narratorStance": True,
                "audienceResponse": True,
                "laRetrieval": True,
                "figurative": True,
                "keyTerms": True,
            }
        )
        
        return await EventService._transform_event(event, passage_id)

    @staticmethod
    async def delete(id: str) -> Dict:
        """Delete an event"""
        return await db.event.delete(
            where={"id": id}
        )

