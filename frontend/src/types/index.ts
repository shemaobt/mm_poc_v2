/**
 * TypeScript type definitions
 */

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
}

export interface PassageData {
    id: string  // UUID from backend
    reference: string
    source_lang: string
    clauses: Clause[]
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

export interface PropertyDimension {
    dimension: string
    value: string
    degree?: string
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

export interface EventBase {
    eventId: string
    clauseId?: string
    category: string
    eventCore: string
    discourseFunction?: string
    chainPosition?: string
    narrativeFunction?: string
    roles: EventRoleBase[]
}

export interface EventCreate extends EventBase { }

export interface EventResponse extends EventBase {
    id: string
    passageId: string
    roles: EventRoleBase[]
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
