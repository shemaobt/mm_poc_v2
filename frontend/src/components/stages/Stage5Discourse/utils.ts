import { EventResponse, ParticipantResponse, PassageData } from '../../../types'
import { EventDisplay } from './types'

interface DbClause {
    id: string
    clauseIndex?: number
    text: string
    gloss?: string
    freeTranslation?: string
}

export function buildEventDisplay(
    eventId: string,
    events: EventResponse[],
    dbClauses: DbClause[],
    passageData: PassageData | null,
    participants: ParticipantResponse[]
): EventDisplay {
    const ev = events.find(e => e.id === eventId || e.eventId === eventId)
    if (!ev) return { id: eventId, core: 'Unknown', category: 'ACTION', clause: null, roles: [] }

    const dbClause = dbClauses.find(c => c.id === ev.clauseId)
    const bhsaClause = dbClause
        ? passageData?.clauses?.find(c => c.clause_id === dbClause.clauseIndex)
        : null

    const clause = dbClause ? {
        text: dbClause.text,
        gloss: dbClause.gloss || bhsaClause?.gloss,
        freeTranslation: dbClause.freeTranslation || bhsaClause?.freeTranslation
    } : null

    const roles = (ev.roles || [])
        .map(role => {
            const participant = participants.find(p =>
                p.id === role.participantId || p.participantId === role.participantId
            )
            const gloss = participant?.gloss || role.participantId
            return {
                role: role.role,
                participantId: role.participantId,
                participantGloss: gloss
            }
        })
        .filter(role => role.participantGloss && role.participantGloss.trim() !== '')

    return {
        id: ev.eventId,
        core: ev.eventCore,
        category: ev.category || 'ACTION',
        discourseFunction: ev.discourseFunction,
        narrativeFunction: ev.narrativeFunction,
        clause,
        roles
    }
}
