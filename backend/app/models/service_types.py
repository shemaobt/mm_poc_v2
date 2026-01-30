from typing import List, Optional, Any
from pydantic import BaseModel


class StatusResponse(BaseModel):
    """Generic status response with optional data."""
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None


class LockInfo(BaseModel):
    """Pericope lock information."""
    pericopeRef: str
    userId: str
    userName: str
    startedAt: str
    lastActivity: str


class LockResponse(BaseModel):
    """Response for lock operations."""
    status: str
    message: str
    lock: Optional[LockInfo] = None


class UnlockResponse(BaseModel):
    """Response for unlock operations."""
    status: str
    message: str


class HeartbeatResponse(BaseModel):
    """Response for lock heartbeat."""
    status: str
    lastActivity: str


class ContributorInfo(BaseModel):
    """Contributor information."""
    id: str
    username: str


class PericopeInfo(BaseModel):
    """Pericope information with optional lock."""
    id: str
    reference: str
    book: str
    chapterStart: int
    verseStart: int
    chapterEnd: Optional[int] = None
    verseEnd: Optional[int] = None
    lock: Optional[LockInfo] = None


class DeleteResponse(BaseModel):
    """Response for delete operations."""
    status: str
    message: str
    deleted_count: int


class ResetResponse(BaseModel):
    """Response for reset operations."""
    status: str
    message: str
    deleted_counts: Optional[dict] = None


class UserInfo(BaseModel):
    """User information."""
    id: str
    username: str
    email: str
    role: str
    status: str
    createdAt: str


class UserProgressInfo(BaseModel):
    """User progress information."""
    totalPassages: int
    completedPassages: int
    inProgressPassages: int
    lastActivityAt: Optional[str] = None


class AIModelInfo(BaseModel):
    """AI model information."""
    id: str
    name: str


class AIModelsResponse(BaseModel):
    """Response for available AI models."""
    models: List[AIModelInfo]


class TranslationResponse(BaseModel):
    """Response for clause translation."""
    message: str
    updated_count: int
    translations: dict


class Phase1Data(BaseModel):
    """Phase 1 analysis data (participants and relations)."""
    participants: List[Any]
    relations: List[Any]


class Phase2Data(BaseModel):
    """Phase 2 analysis data (events and discourse)."""
    events: List[Any]
    discourse: List[Any]


class AnalysisResponse(BaseModel):
    """Response for AI analysis operations."""
    status: str
    data: Optional[Any] = None


class StreamProgress(BaseModel):
    """Progress update for streaming operations."""
    step: str
    phase: Optional[int] = None
    current: Optional[int] = None
    total: Optional[int] = None
    message: Optional[str] = None
    
    
class AnalysisSummary(BaseModel):
    """Summary of completed analysis."""
    participants: int
    relations: int
    events: int
    discourse: int


class MetricsAggregateData(BaseModel):
    """Aggregated metrics data."""
    totalPassages: int
    totalEdits: int
    avgEditsPerPassage: float
    aiItemsVsFinalItems: dict
    topEditedFields: List[dict]
    editTrend: List[dict]


class ExportPassageInfo(BaseModel):
    """Passage info for export listing."""
    reference: str
    isComplete: bool
    userId: Optional[str] = None
    username: Optional[str] = None


class TripodExportData(BaseModel):
    """Tripod format export data."""
    reference: str
    book: str
    chapter: int
    verses: str
    clauses: List[Any]
    participants: List[Any]
    relations: List[Any]
    events: List[Any]
    discourse: List[Any]


class RehearsalSegment(BaseModel):
    """Rehearsal text segment."""
    type: str
    content: str
    clauseIds: Optional[List[int]] = None
    hebrew: Optional[str] = None
    audioBase64: Optional[str] = None


class RehearsalData(BaseModel):
    """Complete rehearsal data."""
    id: str
    passageId: str
    rehearsalText: str
    segments: List[RehearsalSegment]
    approvalStatus: str
    createdAt: str


class AudioGenerationResult(BaseModel):
    """Result of audio generation."""
    status: str
    message: str
    segments_updated: int
