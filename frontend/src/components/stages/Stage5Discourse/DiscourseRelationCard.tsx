import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { ArrowRight, Trash2, Check, Pencil } from 'lucide-react'
import { DiscourseRelationResponse } from '../../../types'
import { EventDisplay } from './types'
import { EventBox } from './EventBox'
import { DISCOURSE_RELATIONS_FALLBACK } from './constants'

interface DiscourseRelationCardProps {
    relation: DiscourseRelationResponse
    source: EventDisplay
    target: EventDisplay
    isValidated: boolean
    readOnly: boolean
    onToggleValidation: () => void
    onEdit: () => void
    onDelete: () => void
}

export function DiscourseRelationCard({
    relation,
    source,
    target,
    isValidated,
    readOnly,
    onToggleValidation,
    onEdit,
    onDelete
}: DiscourseRelationCardProps) {
    const relationLabel = DISCOURSE_RELATIONS_FALLBACK.find(r => r.value === relation.relationType)?.label
    const relationHint = relationLabel?.split('(')[1]?.replace(')', '') || ''

    return (
        <Card className={`group transition-all ${isValidated ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={onToggleValidation}
                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                            isValidated
                                ? 'bg-verde-claro/20 text-verde-claro'
                                : 'bg-areia/30 text-areia hover:bg-areia/50'
                        }`}
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isValidated
                                ? 'border-verde-claro bg-verde-claro'
                                : 'border-areia'
                        }`}>
                            {isValidated && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-medium">
                            {isValidated ? 'Validated' : 'Click to validate'}
                        </span>
                    </button>
                </div>

                <div className="flex items-start gap-4">
                    <EventBox event={source} side="source" />

                    <div className="flex flex-col items-center justify-center gap-2 py-4 min-w-[120px]">
                        <Badge variant="success" className="text-xs uppercase font-bold px-3 py-1">
                            {relation.relationType}
                        </Badge>
                        <ArrowRight className="w-8 h-8 text-telha" />
                        <span className="text-[10px] text-verde/60 text-center">
                            {relationHint}
                        </span>
                    </div>

                    <EventBox event={target} side="target" />

                    {!readOnly && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 self-center"
                                onClick={onEdit}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 text-red-500 self-center"
                                onClick={onDelete}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
