import { Badge } from '../../ui/badge'
import { ClauseData } from './types'

interface ClauseDisplayUnitProps {
    clauseIds: number[]
    clauses: ClauseData[]
    isMerged: boolean
    isMainline: boolean
    isChecked: boolean
    onToggleCheck: () => void
    readOnly: boolean
}

export function ClauseDisplayUnit({
    clauseIds,
    clauses,
    isMerged,
    isMainline,
    isChecked,
    onToggleCheck,
    readOnly
}: ClauseDisplayUnitProps) {
    const combinedText = clauses.map((c) => c.text).filter(Boolean).join(' ')
    const combinedGloss = clauses.map((c) => c.gloss).filter(Boolean).join(' ')
    const combinedTranslation = clauses.map((c) => c.freeTranslation).filter(Boolean).join(' ')
    
    const verseLabel = clauses.length === 1
        ? `v${clauses[0].verse}`
        : `v${Math.min(...clauses.map((c) => c.verse))}–${Math.max(...clauses.map((c) => c.verse))}`

    return (
        <div className={`clause-card ${isMainline ? 'clause-card-mainline' : 'clause-card-background'}`}>
            <div className="flex items-start justify-between gap-4">
                {!readOnly && (
                    <div className="pt-1">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-verde/30 text-telha focus:ring-telha cursor-pointer"
                            checked={isChecked}
                            onChange={onToggleCheck}
                        />
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-medium text-verde/50">
                            {clauses.length === 1
                                ? `Clause ${clauseIds[0]} (${verseLabel})`
                                : `Clauses ${clauseIds[0]}–${clauseIds[clauseIds.length - 1]} (${verseLabel})`
                            }
                        </span>
                        <Badge variant={isMainline ? 'warning' : 'success'}>
                            {isMainline ? 'Mainline' : 'Background'}
                        </Badge>
                        {isMerged && (
                            <Badge variant="outline" className="text-telha border-telha/40 bg-telha/5 text-xs" title="AI merged these adjacent clauses for readability">
                                AI merged
                            </Badge>
                        )}
                    </div>
                    <p className="text-preto text-sm mb-2">{combinedGloss || '—'}</p>
                    {combinedTranslation && (
                        <p className="text-telha text-sm mb-2 italic border-l-2 border-telha/20 pl-2">
                            "{combinedTranslation}"
                        </p>
                    )}
                    {clauses.length === 1 && (clauses[0].lemma_ascii || clauses[0].lemma) && (
                        <p className="text-verde text-xs">
                            <strong>Verb:</strong> {clauses[0].lemma_ascii || clauses[0].lemma} ({clauses[0].binyan || 'qal'}) - {clauses[0].tense || 'perf'}
                        </p>
                    )}
                    {clauses.length > 1 && (
                        <p className="text-verde text-xs">
                            {clauses.map((c) => c.lemma_ascii || c.lemma).filter(Boolean).join(' · ') || '—'}
                        </p>
                    )}
                </div>
                <div className="hebrew-text text-lg text-preto/80 font-serif min-w-[200px] text-right">
                    {combinedText || '—'}
                </div>
            </div>
        </div>
    )
}
