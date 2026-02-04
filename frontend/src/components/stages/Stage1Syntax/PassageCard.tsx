import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Sparkles, Trash2, Check } from 'lucide-react'
import { ClauseDisplayUnit } from './ClauseDisplayUnit'
import { ClauseData, DisplayUnit } from './types'

interface PassageCardProps {
    reference: string
    clauses: ClauseData[]
    displayUnits: DisplayUnit[]
    mainlineCount: number
    backgroundCount: number
    mergedUnitsCount: number
    checkedClauses: Set<string>
    toggleClauseCheck: (id: string) => void
    readOnly: boolean
    isAdmin: boolean
    bhsaLoaded: boolean
    allClausesChecked: boolean

    onDiscardSession: () => void
    onValidateAll: () => void
    onShowAIModal: () => void
}

export function PassageCard({
    reference,
    clauses,
    displayUnits,
    mainlineCount,
    backgroundCount,
    mergedUnitsCount,
    checkedClauses,
    toggleClauseCheck,
    readOnly,
    isAdmin,
    bhsaLoaded,
    allClausesChecked,

    onDiscardSession,
    onValidateAll,
    onShowAIModal
}: PassageCardProps) {
    const clauseById = useMemo(() => {
        const map: Record<number, ClauseData> = {}
        clauses.forEach((c) => { map[c.clause_id] = c })
        return map
    }, [clauses])

    return (
        <Card className="animate-in">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl text-telha">{reference}</CardTitle>
                    <CardDescription>
                        Total Clauses: {clauses.length}
                        {displayUnits.length !== clauses.length && (
                            <> • Display rows: {displayUnits.length}</>
                        )}
                        {' • '}
                        Mainline: {mainlineCount} •
                        Background: {backgroundCount}
                    </CardDescription>
                    <p className="text-xs text-verde/50 mt-1">
                        Clauses come from BHSA (ETCBC). Some are single-word (e.g. short imperatives)—that is expected.
                    </p>
                    {mergedUnitsCount > 0 && (
                        <p className="text-xs text-telha/80 mt-1 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI merged {mergedUnitsCount} group{mergedUnitsCount !== 1 ? 's' : ''} of adjacent clauses for readability. Merged rows are marked below.
                        </p>
                    )}
                </div>
                {!readOnly && (
                    <div className="flex gap-2">

                        <Button
                            onClick={onDiscardSession}
                            variant="outline"
                            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            title="Discard current session and start fresh"
                        >
                            <Trash2 className="w-4 h-4" />
                            Discard Session
                        </Button>
                        {isAdmin && (
                            <Button
                                onClick={onValidateAll}
                                variant="outline"
                                className="gap-2"
                                disabled={!clauses.length}
                            >
                                <Check className="w-4 h-4" />
                                Validate All
                            </Button>
                        )}
                        <Button
                            onClick={onShowAIModal}
                            variant="default"
                            className="gap-2"
                            disabled={!bhsaLoaded || !allClausesChecked}
                            title={!allClausesChecked ? "Please read and check all clauses first" : "Run AI Analysis"}
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Analyze
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {displayUnits.map((unit) => {
                        const ids = unit.clause_ids ?? []
                        const clausesInUnit = ids.map((id: number) => clauseById[id]).filter(Boolean)
                        const isMerged = Boolean(unit.merged && clausesInUnit.length > 1)
                        const isMainline = clausesInUnit.some((c) => c.is_mainline)
                        const unitKey = ids.join('-')
                        const unitClauseIdStrs = ids.map((id: number) => String(id))
                        const isUnitChecked = unitClauseIdStrs.length > 0 && unitClauseIdStrs.every((id: string) => checkedClauses.has(id))

                        const handleUnitCheck = () => {
                            if (isUnitChecked) {
                                unitClauseIdStrs.forEach((id: string) => {
                                    if (checkedClauses.has(id)) toggleClauseCheck(id)
                                })
                            } else {
                                unitClauseIdStrs.forEach((id: string) => {
                                    if (!checkedClauses.has(id)) toggleClauseCheck(id)
                                })
                            }
                        }

                        return (
                            <ClauseDisplayUnit
                                key={unitKey}
                                clauseIds={ids}
                                clauses={clausesInUnit}
                                isMerged={isMerged}
                                isMainline={isMainline}
                                isChecked={isUnitChecked}
                                onToggleCheck={handleUnitCheck}
                                readOnly={readOnly}
                            />
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
