export interface EventRole {
    role: string
    participantId: string | null
    participantGloss: string | null
}

export interface ClauseDisplay {
    text: string
    gloss?: string
    freeTranslation?: string
}

export interface EventDisplay {
    id: string
    core: string
    category: string
    discourseFunction?: string
    narrativeFunction?: string
    clause: ClauseDisplay | null
    roles: EventRole[]
}
