import { ArrowRight, Check, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { RelationCardProps } from './types'

function getParticipantDisplay(
    id: string, 
    obj: { participantId: string; gloss: string } | undefined,
    participants: { id: string; participantId: string; gloss: string }[]
): string {
    if (obj) return `${obj.participantId} (${obj.gloss})`
    const p = participants.find(p => p.id === id || p.participantId === id)
    return p ? `${p.participantId} (${p.gloss})` : 'Unknown'
}

export function RelationCard({
    relation,
    isValidated,
    readOnly,
    participants,
    onToggleValidation,
    onEdit,
    onDelete
}: RelationCardProps) {
    return (
        <Card className={`group transition-all ${isValidated ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    {!readOnly && (
                        <button
                            onClick={onToggleValidation}
                            className={`flex items-center gap-2 px-2 py-1 rounded transition-all mr-4 ${
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
                        </button>
                    )}

                    <div className="flex items-center gap-4 flex-1">
                        <div className="font-medium text-preto">
                            {getParticipantDisplay(relation.sourceId, relation.source, participants)}
                        </div>
                        <div className="flex flex-col items-center">
                            <Badge variant="success" className="text-xs">{relation.category}</Badge>
                            <div className="flex items-center gap-1 text-telha font-semibold text-sm mt-1">
                                <ArrowRight className="w-4 h-4" />
                                {relation.type}
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="font-medium text-preto">
                            {getParticipantDisplay(relation.targetId, relation.target, participants)}
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={onEdit}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={onDelete}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
