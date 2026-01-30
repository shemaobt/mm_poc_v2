export interface Clause {
    clause_id: number
    verse: number
    text: string
    gloss: string
    clause_type: string
    is_mainline: boolean
    chain_position?: string
    lemma?: string
    lemma_ascii?: string
    binyan?: string
    tense?: string
    subjects?: string[]
    objects?: string[]
    has_ki: boolean
    names?: string[]
    freeTranslation?: string
}

/** One display unit in Stage 1: either a single clause or AI-merged adjacent clauses */
export interface DisplayUnit {
    clause_ids: number[]
    merged?: boolean
}

export interface PassageData {
    id: string
    reference: string
    source_lang: string
    clauses: Clause[]
    /** When present, Stage 1 shows one row per unit; merged units show "AI merged (Clauses X–Y)" */
    display_units?: DisplayUnit[]
}

export interface Participant {
    id: string
    participantId: string
    hebrew: string
    gloss: string
    type: string
    quantity?: string
    referenceStatus?: string
    properties?: PropertyDimension[]
}

export interface PropertyDimension {
    dimension: string
    value: string
    degree?: string
}

export interface Event {
    id: string
    eventId: string
    clauseId?: string
    category: string
    eventCore: string
    discourseFunction?: string
    narrativeFunction?: string
}

export interface BHSAStatus {
    status: 'loaded' | 'not_loaded'
    bhsa_loaded: boolean
}

export interface ParticipantBase {
    participantId: string
    hebrew: string
    gloss: string
    type: string
    quantity?: string
    referenceStatus?: string
    properties?: PropertyDimension[]
}

export interface ParticipantCreate extends ParticipantBase { }

export interface ParticipantResponse extends ParticipantBase {
    id: string
    passageId: string
}

export interface RelationBase {
    category: string
    type: string
    sourceId: string
    targetId: string
}

export interface RelationCreate extends RelationBase { }

export interface RelationResponse extends RelationBase {
    id: string
    passageId: string
    source?: ParticipantResponse
    target?: ParticipantResponse
}

export interface EventRoleBase {
    role: string
    participantId: string | null
}

export interface EventModifier {
    happened?: string
    realness?: string
    when?: string
    viewpoint?: string
    phase?: string
    repetition?: string
    onPurpose?: string
    howKnown?: string
    causation?: string
}

export interface SpeechAct {
    type?: string
    quotationType?: string
}

export interface EventPragmatic {
    register?: string
    socialAxis?: string
    prominence?: string
    pacing?: string
}

export interface EventEmotion {
    id?: string
    participantId?: string
    primary: string
    secondary?: string
    intensity: string
    source: string
    confidence: string
    notes?: string
}

export interface NarratorStance {
    stance?: string
}

export interface AudienceResponse {
    response?: string
}

export interface LARetrieval {
    emotionTags?: string[]
    eventTags?: string[]
    registerTags?: string[]
    discourseTags?: string[]
    socialTags?: string[]
}

export interface Figurative {
    isFigurative?: boolean
    figureType?: string
    sourceDomain?: string
    targetDomain?: string
    literalMeaning?: string
    intendedMeaning?: string
    transferability?: string
    translationNote?: string
}

export interface KeyTerm {
    id?: string
    termId: string
    sourceLemma: string
    semanticDomain: string
    consistency: string
}

export interface EventBase {
    eventId: string
    clauseId?: string
    /** Clause IDs (1-based) in this display unit; aligns with Stage 1 grouping */
    unitClauseIds?: number[]
    category: string
    eventCore: string
    discourseFunction?: string
    chainPosition?: string
    narrativeFunction?: string
    roles: EventRoleBase[]
}

export interface EventCreate extends EventBase {
    modifiers?: EventModifier
    speechAct?: SpeechAct
    pragmatic?: EventPragmatic
    emotions?: EventEmotion[]
    narratorStance?: NarratorStance
    audienceResponse?: AudienceResponse
    laRetrieval?: LARetrieval
    figurative?: Figurative
    keyTerms?: KeyTerm[]
}

export interface EventResponse extends EventBase {
    id: string
    passageId: string
    roles: EventRoleBase[]
    modifiers?: EventModifier
    speechAct?: SpeechAct
    pragmatic?: EventPragmatic
    emotions?: EventEmotion[]
    narratorStance?: NarratorStance
    audienceResponse?: AudienceResponse
    laRetrieval?: LARetrieval
    figurative?: Figurative
    keyTerms?: KeyTerm[]
}

export interface DiscourseRelationBase {
    relationType: string
    sourceId: string
    targetId: string
}

export interface DiscourseRelationCreate extends DiscourseRelationBase { }

export interface DiscourseRelationResponse extends DiscourseRelationBase {
    id: string
    passageId: string
    source?: EventResponse
    target?: EventResponse
}
