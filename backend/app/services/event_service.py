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
            order={"eventId": "asc"}
        )
        
        # Transform to match frontend expectations
        result = []
        for ev in events:
            ev_dict = {
                "id": ev.id,
                "passageId": ev.passageId,
                "eventId": ev.eventId,
                "clauseId": ev.clauseId,
                "category": ev.category,
                "eventCore": ev.eventCore,
                "discourseFunction": ev.discourseFunction,
                "chainPosition": ev.chainPosition,
                "narrativeFunction": ev.narrativeFunction,
                "roles": [{"role": r.role, "participantId": r.participantId} for r in (ev.roles or [])],
            }
            
            # Add modifiers if present
            if ev.modifiers:
                ev_dict["modifiers"] = {
                    "happened": ev.modifiers.happened,
                    "realness": ev.modifiers.realness,
                    "when": ev.modifiers.when,
                    "viewpoint": ev.modifiers.viewpoint,
                    "phase": ev.modifiers.phase,
                    "repetition": ev.modifiers.repetition,
                    "onPurpose": ev.modifiers.onPurpose,
                    "howKnown": ev.modifiers.howKnown,
                    "causation": ev.modifiers.causation,
                }
            
            # Add speech act if present
            if ev.speechAct:
                ev_dict["speechAct"] = {
                    "type": ev.speechAct.type,
                    "quotationType": ev.speechAct.quotationType,
                }
            
            # Add pragmatic if present
            if ev.pragmatic:
                ev_dict["pragmatic"] = {
                    "register": ev.pragmatic.discourseRegister,
                    "socialAxis": ev.pragmatic.socialAxis,
                    "prominence": ev.pragmatic.prominence,
                    "pacing": ev.pragmatic.pacing,
                }
            
            # Add emotions if present
            if ev.emotions:
                ev_dict["emotions"] = [{
                    "id": e.id,
                    "participantId": e.participantId,
                    "primary": e.primary,
                    "secondary": e.secondary,
                    "intensity": e.intensity,
                    "source": e.source,
                    "confidence": e.confidence,
                    "notes": e.notes,
                } for e in ev.emotions]
            
            # Add narrator stance if present
            if ev.narratorStance:
                ev_dict["narratorStance"] = {"stance": ev.narratorStance.stance}
            
            # Add audience response if present
            if ev.audienceResponse:
                ev_dict["audienceResponse"] = {"response": ev.audienceResponse.response}
            
            # Add LA retrieval if present
            if ev.laRetrieval:
                ev_dict["laRetrieval"] = {
                    "emotionTags": ev.laRetrieval.emotionTags,
                    "eventTags": ev.laRetrieval.eventTags,
                    "registerTags": ev.laRetrieval.registerTags,
                    "discourseTags": ev.laRetrieval.discourseTags,
                    "socialTags": ev.laRetrieval.socialTags,
                }
            
            # Add figurative if present
            if ev.figurative:
                ev_dict["figurative"] = {
                    "isFigurative": ev.figurative.isFigurative,
                    "figureType": ev.figurative.figureType,
                    "sourceDomain": ev.figurative.sourceDomain,
                    "targetDomain": ev.figurative.targetDomain,
                    "literalMeaning": ev.figurative.literalMeaning,
                    "intendedMeaning": ev.figurative.intendedMeaning,
                    "transferability": ev.figurative.transferability,
                    "translationNote": ev.figurative.translationNote,
                }
            
            # Add key terms if present
            if ev.keyTerms:
                ev_dict["keyTerms"] = [{
                    "id": kt.id,
                    "termId": kt.termId,
                    "sourceLemma": kt.sourceLemma,
                    "semanticDomain": kt.semanticDomain,
                    "consistency": kt.consistency,
                } for kt in ev.keyTerms]
            
            result.append(ev_dict)
        
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
        
        # Add roles - only roles with valid participants
        if data.roles:
            role_creates = []
            for r in data.roles:
                if not r.participantId:
                    continue  # Skip roles without participant
                # Find participant by participantId string
                participant = await db.participant.find_first(
                    where={"passageId": passage_id, "participantId": r.participantId}
                )
                if participant:
                    role_data: Dict[str, Any] = {
                        "role": r.role,
                        "participant": {"connect": {"id": participant.id}}
                    }
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
        
        # Add emotions
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
                        emo_data["participant"] = {"connect": {"id": participant.id}}
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
        # Get current event to find passage_id
        current = await db.event.find_unique(where={"id": id})
        if not current:
            raise ValueError(f"Event {id} not found")
        
        passage_id = current.passageId
        
        # Build role creates - only roles with valid participants
        role_creates = []
        for r in (data.roles or []):
            if not r.participantId:
                continue  # Skip roles without participant
            participant = await db.participant.find_first(
                where={"passageId": passage_id, "participantId": r.participantId}
            )
            if participant:
                role_data: Dict[str, Any] = {
                    "role": r.role,
                    "participant": {"connect": {"id": participant.id}}
                }
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
            update_data["clause"] = {"connect": {"id": data.clauseId}}
        
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
        
        # Update speech act
        if data.speechAct and (data.speechAct.type or data.speechAct.quotationType):
            update_data["speechAct"] = {
                "upsert": {
                    "create": {
                        "type": data.speechAct.type or "",
                        "quotationType": data.speechAct.quotationType,
                    },
                    "update": {
                        "type": data.speechAct.type or "",
                        "quotationType": data.speechAct.quotationType,
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
        
        # Update emotions (delete all and recreate)
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
                        emo_data["participant"] = {"connect": {"id": participant.id}}
                emotion_creates.append(emo_data)
            update_data["emotions"] = {
                "deleteMany": {},
                "create": emotion_creates,
            }
        
        # Update narrator stance
        if data.narratorStance:
            update_data["narratorStance"] = {
                "upsert": {
                    "create": {"stance": data.narratorStance.stance},
                    "update": {"stance": data.narratorStance.stance}
                }
            }
        
        # Update audience response
        if data.audienceResponse:
            update_data["audienceResponse"] = {
                "upsert": {
                    "create": {"response": data.audienceResponse.response},
                    "update": {"response": data.audienceResponse.response}
                }
            }
        
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
        
        # Perform the update
        event = await db.event.update(
            where={"id": id},
            data=update_data,
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
        
        return await EventService._transform_event(event, passage_id)

    @staticmethod
    async def _transform_event(event, passage_id: str) -> Dict:
        """Transform Prisma event to response format"""
        ev_dict: Dict[str, Any] = {
            "id": event.id,
            "passageId": passage_id,
            "eventId": event.eventId,
            "clauseId": event.clauseId,
            "category": event.category,
            "eventCore": event.eventCore,
            "discourseFunction": event.discourseFunction,
            "chainPosition": event.chainPosition,
            "narrativeFunction": event.narrativeFunction,
            "roles": [{"role": r.role, "participantId": r.participantId} for r in (event.roles or [])],
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
    async def delete(id: str) -> Dict:
        """Delete an event"""
        return await db.event.delete(
            where={"id": id}
        )
