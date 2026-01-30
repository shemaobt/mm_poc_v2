from typing import List, Dict, Any, Optional
from prisma import Json
from app.core.database import db
from app.models.schemas import EventCreate


def natural_sort_key_for_event(event: Any) -> tuple:
    """
    Generate a sort key for natural ordering of events by ID.
    
    Args:
        event: An event object with eventId attribute.
        
    Returns:
        A tuple (priority, value) for sorting. Priority 0 for e<number> format.
    """
    s = event.eventId
    if s.startswith('e') and s[1:].isdigit():
        return (0, int(s[1:]))
    return (1, s)


class EventService:
    
    @staticmethod
    async def get_by_passage(passage_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all events for a passage with all related data.
        
        Args:
            passage_id: The ID of the passage.
            
        Returns:
            A list of events sorted naturally by eventId, with all sub-models included.
        """
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
        )
        
        events.sort(key=natural_sort_key_for_event)
        result = [await EventService._transform_event(ev, passage_id) for ev in events]
        
        return result

    @staticmethod
    async def create(passage_id: str, data: EventCreate) -> Dict[str, Any]:
        """
        Create a new event with all sub-models, or update if eventId already exists.
        
        Args:
            passage_id: The ID of the passage.
            data: The event creation data including roles, modifiers, etc.
            
        Returns:
            The created or updated event in response format.
        """
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
        
        if data.speechAct and (data.speechAct.type or data.speechAct.quotationType):
            event_data["speechAct"] = {"create": {
                "type": data.speechAct.type or "",
                "quotationType": data.speechAct.quotationType,
            }}
        
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
        
        if data.narratorStance and data.narratorStance.stance:
            event_data["narratorStance"] = {"create": {"stance": data.narratorStance.stance}}
        
        if data.audienceResponse and data.audienceResponse.response:
            event_data["audienceResponse"] = {"create": {"response": data.audienceResponse.response}}
        
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
        
        if data.keyTerms:
            term_creates = [{
                "termId": kt.termId,
                "sourceLemma": kt.sourceLemma,
                "semanticDomain": kt.semanticDomain,
                "consistency": kt.consistency,
            } for kt in data.keyTerms]
            event_data["keyTerms"] = {"create": term_creates}
        
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
        
        return await EventService._transform_event(event, passage_id)

    @staticmethod
    async def update(id: str, data: EventCreate) -> Dict:
        """
        Update event and all its nested relations.
        
        Args:
            id: The event ID.
            data: The event data to update.
            
        Returns:
            The updated event in response format.
            
        Raises:
            ValueError: If event not found.
        """
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
        
        if data.narratorStance and data.narratorStance.stance:
            update_data["narratorStance"] = {
                "upsert": {
                    "create": {"stance": data.narratorStance.stance},
                    "update": {"stance": data.narratorStance.stance}
                }
            }
        elif data.narratorStance and current.narratorStance:
             update_data["narratorStance"] = {"delete": True}
        
        if data.audienceResponse and data.audienceResponse.response:
            update_data["audienceResponse"] = {
                "upsert": {
                    "create": {"response": data.audienceResponse.response},
                    "update": {"response": data.audienceResponse.response}
                }
            }
        elif data.audienceResponse and current.audienceResponse:
             update_data["audienceResponse"] = {"delete": True}
        
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
                if current.figurative:
                    update_data["figurative"] = {"delete": True}
        
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
        """
        Transform Prisma event to response format.
        
        Args:
            event: The Prisma event object.
            passage_id: The passage ID.
            
        Returns:
            Event dictionary with roles using logical participantId for UI.
        """
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
        
        Args:
            id: The event ID.
            data: The partial event data to update.
            
        Returns:
            The updated event in response format.
            
        Raises:
            ValueError: If event not found.
        """
        from app.models.schemas import EventPatch
        
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
        
        if data.emotions is not None:
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
        
        if not update_data:
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
        """
        Delete an event.
        
        Args:
            id: The event ID.
            
        Returns:
            The deleted event data.
        """
        return await db.event.delete(
            where={"id": id}
        )
