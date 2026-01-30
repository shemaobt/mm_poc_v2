import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Pencil, Trash2, User, Check } from 'lucide-react'
import { EventCardProps } from './types'
import { QUOTATION_TYPES } from '../../../constants/tripod'
import { eventCategoryColors, fieldIndicatorStyles, EventCategory } from '@/styles'

const getCategoryColor = (cat: string): string => {
    return eventCategoryColors[cat as EventCategory] || 'bg-gray-100 text-gray-800 border-gray-200'
}

function getFieldIndicators(event: EventCardProps['event'], participants: EventCardProps['participants']) {
    const validRoles = (event.roles || []).filter(r => {
        const p = participants.find(p => p.participantId === r.participantId || p.id === r.participantId)
        return p && p.gloss && p.gloss.trim() !== ''
    })

    const hasModifiers = event.modifiers && Object.values(event.modifiers).some(v => v !== null && v !== undefined && v !== '')
    const hasSpeechAct = event.speechAct && (event.speechAct.type || event.speechAct.quotationType)
    const hasPragmatic = event.pragmatic && Object.values(event.pragmatic).some(v => v !== null && v !== undefined && v !== '')
    const hasNarratorStance = event.narratorStance && event.narratorStance.stance
    const hasAudienceResponse = event.audienceResponse && event.audienceResponse.response
    const hasFigurative = event.figurative && event.figurative.isFigurative
    const hasLaTags = event.laRetrieval && (
        (event.laRetrieval.emotionTags?.length || 0) > 0 ||
        (event.laRetrieval.eventTags?.length || 0) > 0 ||
        (event.laRetrieval.registerTags?.length || 0) > 0 ||
        (event.laRetrieval.discourseTags?.length || 0) > 0 ||
        (event.laRetrieval.socialTags?.length || 0) > 0
    )
    const emotionsCount = (event.emotions || []).length
    const keyTermsCount = (event.keyTerms || []).length

    return {
        roles: validRoles.length,
        modifiers: hasModifiers,
        speechAct: hasSpeechAct,
        pragmatic: hasPragmatic,
        narratorStance: hasNarratorStance,
        audienceResponse: hasAudienceResponse,
        figurative: hasFigurative,
        laTags: hasLaTags,
        emotions: emotionsCount,
        keyTerms: keyTermsCount
    }
}

function ClauseDisplay({ event, passageData, dbClauses }: { event: EventCardProps['event']; passageData: any; dbClauses: any[] }) {
    const unitIds = (event as any).unitClauseIds as number[] | undefined
    
    if (unitIds?.length && passageData?.clauses) {
        const bhsaClauses = unitIds
            .map((cid: number) => passageData.clauses.find((c: any) => c.clause_id === cid))
            .filter(Boolean)
        const clauseText = bhsaClauses.map((c: any) => c.text).filter(Boolean).join(' ')
        const clauseGloss = bhsaClauses.map((c: any) => c.gloss).filter(Boolean).join(' ')
        const translation = bhsaClauses.map((c: any) => c.freeTranslation).filter(Boolean).join(' ')
        
        return (
            <div className="mt-2 mb-3 pl-3 border-l-2 border-telha/20">
                {clauseText && (
                    <p className="text-right text-lg font-serif text-preto mb-1" dir="rtl">{clauseText}</p>
                )}
                {clauseGloss && (
                    <p className="text-sm text-verde italic mb-1">{clauseGloss}</p>
                )}
                {translation && (
                    <p className="text-sm text-telha italic">"{translation}"</p>
                )}
                {!clauseText && !translation && (
                    <p className="text-xs text-cinza/50 italic">(No clause data)</p>
                )}
            </div>
        )
    }

    const dbClause = event.clauseId
        ? dbClauses.find(c => c.id === event.clauseId)
        : null
    const bhsaClause = dbClause
        ? passageData?.clauses?.find((c: any) => c.clause_id === (dbClause.clauseIndex + 1))
        : null

    if (!event.clauseId && !unitIds?.length) {
        return (
            <div className="mt-2 mb-3 pl-3 border-l-2 border-amarelo/20">
                <p className="text-xs text-amarelo/70 italic">(No segment linked)</p>
            </div>
        )
    }

    const translation = dbClause?.freeTranslation || bhsaClause?.freeTranslation
    const clauseText = dbClause?.text || bhsaClause?.text
    const clauseGloss = dbClause?.gloss || bhsaClause?.gloss

    return (
        <div className="mt-2 mb-3 pl-3 border-l-2 border-telha/20">
            {clauseText && (
                <p className="text-right text-lg font-serif text-preto mb-1" dir="rtl">{clauseText}</p>
            )}
            {clauseGloss && (
                <p className="text-sm text-verde italic mb-1">{clauseGloss}</p>
            )}
            {translation && (
                <p className="text-sm text-telha italic">"{translation}"</p>
            )}
            {!clauseText && !translation && (
                <p className="text-xs text-cinza/50 italic">(No clause data available)</p>
            )}
        </div>
    )
}

function FieldIndicators({ event, participants }: { event: EventCardProps['event']; participants: EventCardProps['participants'] }) {
    const indicators = getFieldIndicators(event, participants)
    
    return (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-areia/20">
            {indicators.roles > 0 && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.roles}`}>
                    👥 {indicators.roles} Roles
                </span>
            )}
            {indicators.modifiers && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.modifiers}`}>
                    ⚙️ Modifiers
                </span>
            )}
            {indicators.speechAct && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.speech}`}>
                    💬 {QUOTATION_TYPES.find(o => o.value === event.speechAct?.quotationType)?.label || event.speechAct?.quotationType || 'Speech'}
                </span>
            )}
            {indicators.pragmatic && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.pragmatic}`}>
                    🗣️ Pragmatic
                </span>
            )}
            {indicators.emotions > 0 && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.emotions}`}>
                    💜 {indicators.emotions} Emotions
                </span>
            )}
            {(indicators.narratorStance || indicators.audienceResponse) && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.viewpoint}`}>
                    🎭 Viewpoint
                </span>
            )}
            {indicators.figurative && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.figurative}`}>
                    🎨 Figurative
                </span>
            )}
            {indicators.keyTerms > 0 && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.keyTerms}`}>
                    🔑 {indicators.keyTerms} Key Terms
                </span>
            )}
            {indicators.laTags && (
                <span className={`text-[10px] px-2 py-1 rounded border font-medium ${fieldIndicatorStyles.laTags}`}>
                    📦 LA Tags
                </span>
            )}
        </div>
    )
}

export function EventCard({
    event,
    participants,
    passageData,
    dbClauses,
    isValidated,
    readOnly,
    onValidate,
    onEdit,
    onDelete
}: EventCardProps) {
    return (
        <Card className={`group transition-all ${isValidated ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {!readOnly && (
                                <button
                                    onClick={onValidate}
                                    className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${isValidated
                                        ? 'bg-verde-claro/20 text-verde-claro'
                                        : 'bg-areia/30 text-areia hover:bg-areia/50'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isValidated
                                        ? 'border-verde-claro bg-verde-claro'
                                        : 'border-areia'
                                    }`}>
                                        {isValidated && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-xs font-medium">
                                        {isValidated ? '✓' : ''}
                                    </span>
                                </button>
                            )}
                            <span className="text-lg font-semibold text-telha">{event.eventId}</span>
                            <span className="text-lg font-medium text-preto">{event.eventCore}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(event.category)}`}>
                                {event.category}
                            </span>
                            {event.discourseFunction && (
                                <span className="text-xs text-verde bg-verde/10 px-2 py-0.5 rounded">
                                    {event.discourseFunction}
                                </span>
                            )}
                            {event.narrativeFunction && (
                                <span className="text-xs text-azul bg-azul/10 px-2 py-0.5 rounded">
                                    {event.narrativeFunction}
                                </span>
                            )}
                        </div>

                        <ClauseDisplay event={event} passageData={passageData} dbClauses={dbClauses} />

                        {event.roles && event.roles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {event.roles
                                    .filter(r => {
                                        const p = participants.find(p => p.participantId === r.participantId || p.id === r.participantId)
                                        const displayValue = p ? p.gloss : r.participantId
                                        return displayValue && displayValue.trim() !== ''
                                    })
                                    .map((r, i) => {
                                        const p = participants.find(p => p.participantId === r.participantId || p.id === r.participantId)
                                        return (
                                            <div key={i} className="flex items-center gap-1.5 bg-areia/20 px-2 py-1 rounded-md text-sm">
                                                <User className="w-3 h-3 text-verde" />
                                                <span className="font-medium text-telha">{r.role}:</span>
                                                <span className="text-preto">{p ? p.gloss : r.participantId}</span>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}

                        <FieldIndicators event={event} participants={participants} />
                    </div>

                    {!readOnly && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={onEdit}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={onDelete}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
