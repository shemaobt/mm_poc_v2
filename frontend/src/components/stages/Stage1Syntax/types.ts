export interface ExistingPassage {
    id: string
    reference: string
    isComplete: boolean
    createdAt: string
}

export interface PreviewData {
    reference: string
    clauseCount: number
    mainline: number
    background: number
}

export interface ClauseData {
    clause_id: number
    verse: number
    text: string
    gloss: string
    clause_type: string
    is_mainline: boolean
    has_ki: boolean
    chain_position?: string
    lemma?: string
    lemma_ascii?: string
    binyan?: string
    tense?: string
    subjects?: string[]
    objects?: string[]
    names?: string[]
    freeTranslation?: string
}

export interface DisplayUnit {
    clause_ids: number[]
    merged?: boolean
}

export const hasPartialVerseIndicator = (reference: string): boolean => {
    const partialVersePattern = /:\d+[a-z]/i
    return partialVersePattern.test(reference)
}

export const stripPartialVerseIndicators = (reference: string): string => {
    return reference.replace(/:(\d+)[a-z]/gi, ':$1')
}
