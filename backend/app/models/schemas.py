"""
Pydantic models/schemas for API requests and responses
Immutable data structures following functional approach
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# PASSAGE MODELS
# ============================================================

class ClauseBase(BaseModel):
    """Base clause model"""
    clauseIndex: int
    verse: int
    text: str
    gloss: str
    clauseType: str
    isMainline: bool = False
    chainPosition: Optional[str] = None
    lemma: Optional[str] = None
    binyan: Optional[str] = None
    tense: Optional[str] = None


class ClauseCreate(ClauseBase):
    """Create clause"""
    pass


class ClauseResponse(ClauseBase):
    """Clause response"""
    id: str
    passageId: str

    class Config:
        from_attributes = True


# ============================================================
# PARTICIPANT MODELS
# ============================================================

class PropertyDimension(BaseModel):
    """Property dimension"""
    dimension: str
    value: str
    degree: Optional[str] = None


class ParticipantBase(BaseModel):
    """Base participant model"""
    participantId: str
    hebrew: str
    gloss: str
    type: Optional[str] = None
    quantity: Optional[str] = None
    referenceStatus: Optional[str] = None
    properties: Optional[List[PropertyDimension]] = None


class ParticipantCreate(ParticipantBase):
    """Create participant"""
    pass


class ParticipantResponse(ParticipantBase):
    """Participant response"""
    id: str
    passageId: str

    class Config:
        from_attributes = True


# ============================================================
# RELATION MODELS
# ============================================================

class RelationBase(BaseModel):
    """Base relation model"""
    category: Optional[str] = None
    type: Optional[str] = None
    sourceId: Optional[str] = None
    targetId: Optional[str] = None

class RelationCreate(RelationBase):
    """Create relation"""
    pass

class RelationResponse(RelationBase):
    """Relation response"""
    id: str
    passageId: str
    source: Optional[ParticipantResponse] = None
    target: Optional[ParticipantResponse] = None

    class Config:
        from_attributes = True


# ============================================================
# EVENT MODELS
# ============================================================

class EventRoleBase(BaseModel):
    """Event role"""
    role: str
    participantId: Optional[str] = None


class EventModifierBase(BaseModel):
    """Event modifiers"""
    happened: Optional[str] = None
    realness: Optional[str] = None
    when: Optional[str] = None
    viewpoint: Optional[str] = None
    phase: Optional[str] = None
    repetition: Optional[str] = None
    onPurpose: Optional[str] = None
    howKnown: Optional[str] = None
    causation: Optional[str] = None


class SpeechActBase(BaseModel):
    """Speech act info"""
    type: Optional[str] = None
    quotationType: Optional[str] = None


class EventPragmaticBase(BaseModel):
    """Event pragmatics"""
    register: Optional[str] = None
    socialAxis: Optional[str] = None
    prominence: Optional[str] = None
    pacing: Optional[str] = None


class EventEmotionBase(BaseModel):
    """Event emotion"""
    participantId: Optional[str] = None
    primary: str
    secondary: Optional[str] = None
    intensity: str
    source: str
    confidence: str
    notes: Optional[str] = None


class NarratorStanceBase(BaseModel):
    """Narrator stance"""
    stance: Optional[str] = None


class AudienceResponseBase(BaseModel):
    """Intended audience response"""
    response: Optional[str] = None


class LARetrievalBase(BaseModel):
    """Language Assistant retrieval tags"""
    emotionTags: Optional[List[str]] = None
    eventTags: Optional[List[str]] = None
    registerTags: Optional[List[str]] = None
    discourseTags: Optional[List[str]] = None
    socialTags: Optional[List[str]] = None


class FigurativeBase(BaseModel):
    """Figurative language info"""
    isFigurative: Optional[bool] = None
    figureType: Optional[str] = None
    sourceDomain: Optional[str] = None
    targetDomain: Optional[str] = None
    literalMeaning: Optional[str] = None
    intendedMeaning: Optional[str] = None
    transferability: Optional[str] = None
    translationNote: Optional[str] = None


class KeyTermBase(BaseModel):
    """Key term"""
    termId: str
    sourceLemma: str
    semanticDomain: str
    consistency: str


class EventBase(BaseModel):
    """Event base"""
    eventId: str
    clauseId: Optional[str] = None
    category: str
    eventCore: str
    discourseFunction: Optional[str] = None
    chainPosition: Optional[str] = None
    narrativeFunction: Optional[str] = None
    roles: List[EventRoleBase] = []


class EventCreate(EventBase):
    """Create event with all sub-models"""
    modifiers: Optional[EventModifierBase] = None
    speechAct: Optional[SpeechActBase] = None
    pragmatic: Optional[EventPragmaticBase] = None
    emotions: Optional[List[EventEmotionBase]] = None
    narratorStance: Optional[NarratorStanceBase] = None
    audienceResponse: Optional[AudienceResponseBase] = None
    laRetrieval: Optional[LARetrievalBase] = None
    figurative: Optional[FigurativeBase] = None
    keyTerms: Optional[List[KeyTermBase]] = None


class EventResponse(EventBase):
    """Event response with all sub-models"""
    id: str
    passageId: str
    unitClauseIds: Optional[List[int]] = None  # BHSA clause_ids for display unit; required for clause text in UI
    modifiers: Optional[EventModifierBase] = None
    speechAct: Optional[SpeechActBase] = None
    pragmatic: Optional[EventPragmaticBase] = None
    emotions: Optional[List[EventEmotionBase]] = None
    narratorStance: Optional[NarratorStanceBase] = None
    audienceResponse: Optional[AudienceResponseBase] = None
    laRetrieval: Optional[LARetrievalBase] = None
    figurative: Optional[FigurativeBase] = None
    keyTerms: Optional[List[KeyTermBase]] = None

    class Config:
        from_attributes = True


class EventPatch(BaseModel):
    """Partial event update - all fields optional for delta updates"""
    eventId: Optional[str] = None
    clauseId: Optional[str] = None
    category: Optional[str] = None
    eventCore: Optional[str] = None
    discourseFunction: Optional[str] = None
    chainPosition: Optional[str] = None
    narrativeFunction: Optional[str] = None
    roles: Optional[List[EventRoleBase]] = None
    modifiers: Optional[EventModifierBase] = None
    speechAct: Optional[SpeechActBase] = None
    pragmatic: Optional[EventPragmaticBase] = None
    emotions: Optional[List[EventEmotionBase]] = None
    narratorStance: Optional[NarratorStanceBase] = None
    audienceResponse: Optional[AudienceResponseBase] = None
    laRetrieval: Optional[LARetrievalBase] = None
    figurative: Optional[FigurativeBase] = None
    keyTerms: Optional[List[KeyTermBase]] = None


# ============================================================
# DISCOURSE MODELS
# ============================================================

class DiscourseRelationBase(BaseModel):
    """Base discourse relation"""
    relationType: Optional[str] = None
    sourceId: Optional[str] = None
    targetId: Optional[str] = None

class DiscourseRelationCreate(DiscourseRelationBase):
    """Create discourse relation"""
    pass

class DiscourseRelationResponse(DiscourseRelationBase):
    """Discourse relation response"""
    id: str
    passageId: str
    source: Optional[EventResponse] = None
    target: Optional[EventResponse] = None

    class Config:
        from_attributes = True


# ============================================================
# FIELD OPTION MODELS
# ============================================================

class FieldOptionBase(BaseModel):
    """Base field option model"""
    category: str
    value: str
    label: str


class FieldOptionCreate(BaseModel):
    """Create field option - only value and optional label needed"""
    value: str
    label: Optional[str] = None  # Defaults to value if not provided


class FieldOptionResponse(FieldOptionBase):
    """Field option response"""
    id: str
    isDefault: bool
    sortOrder: int
    createdBy: Optional[str] = None

    class Config:
        from_attributes = True
