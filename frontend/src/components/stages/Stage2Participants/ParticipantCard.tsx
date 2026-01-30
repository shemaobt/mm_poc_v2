import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Pencil, Trash2, Check } from 'lucide-react'
import { ParticipantCardProps } from './types'

const TYPE_BADGE_VARIANTS: Record<string, string> = {
    divine: 'divine',
    place: 'place',
    time: 'time',
    person: 'person',
    abstract: 'abstract',
    object: 'object',
    group: 'group'
}

export function ParticipantCard({
    participant,
    isValidated,
    readOnly,
    onToggleValidation,
    onEdit,
    onDelete
}: ParticipantCardProps) {
    const badgeVariant = TYPE_BADGE_VARIANTS[participant.type] || 'default'

    return (
        <Card className={`group transition-all ${isValidated ? 'border-verde-claro/50 bg-verde-claro/5' : 'hover:border-telha/30'}`}>
            <CardContent className="p-4">
                {!readOnly && (
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={onToggleValidation}
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
                                {isValidated ? 'Validated' : 'Click to validate'}
                            </span>
                        </button>
                    </div>
                )}

                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-telha">{participant.participantId}</span>
                        <Badge variant={badgeVariant as any}>{participant.type || 'N/A'}</Badge>
                    </div>
                    <div className="hebrew-text text-lg">{participant.hebrew}</div>
                </div>
                <p className="text-preto text-sm italic mb-2">{participant.gloss}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="default" className="text-xs border-preto/20">{participant.quantity || 'N/A'}</Badge>
                    <Badge variant="default" className="text-xs border-preto/20">{participant.referenceStatus || 'N/A'}</Badge>
                    {participant.properties?.map((prop, i) => (
                        <Badge key={i} variant="default" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                            {prop.dimension}: {prop.value}
                        </Badge>
                    ))}
                </div>

                {!readOnly && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={onEdit}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={onDelete}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
