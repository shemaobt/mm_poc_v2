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
    type: str
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
    category: str
    type: str
    sourceId: str
    targetId: str

class RelationCreate(RelationBase):
    """Create relation"""
    pass

class RelationResponse(RelationBase):
    """Relation response"""
    id: str
    passageId: str

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
    # Simplified for POC, could add modifiers etc here

class EventCreate(EventBase):
    """Create event"""
    pass

class EventResponse(EventBase):
    """Event response"""
    id: str
    passageId: str
    
    class Config:
        from_attributes = True
    """Base event model"""
    eventId: str
    clauseId: Optional[str] = None
    category: str
    eventCore: str
    discourseFunction: Optional[str] = None
    narrativeFunction: Optional[str] = None


class EventCreate(EventBase):
    """Create event"""
    roles: Optional[List[EventRoleBase]] = None
    modifiers: Optional[EventModifierBase] = None


class EventResponse(EventBase):
    """Event response"""
    id: str
    passageId: str
    roles: List[EventRoleBase] = []

    class Config:
        from_attributes = True


# ============================================================
# DISCOURSE MODELS
# ============================================================

class DiscourseRelationBase(BaseModel):
    """Base discourse relation"""
    relationType: str
    sourceId: str
    targetId: str

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
