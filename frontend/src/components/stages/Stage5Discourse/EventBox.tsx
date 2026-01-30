import { Badge } from '../../ui/badge'
import { Zap, Users } from 'lucide-react'
import { EventDisplay } from './types'
import { CATEGORY_COLORS } from './constants'

interface EventBoxProps {
    event: EventDisplay
    side: 'source' | 'target'
}

export function EventBox({ event, side }: EventBoxProps) {
    const isSource = side === 'source'
    const borderColor = isSource ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'
    const headerBg = isSource ? 'bg-amber-100/50' : 'bg-emerald-100/50'
    const iconColor = isSource ? 'text-amber-600' : 'text-emerald-600'

    return (
        <div className={`flex-1 rounded-lg border-2 overflow-hidden ${borderColor}`}>
            <div className={`px-3 py-2 flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${iconColor}`} />
                    <span className="font-bold text-preto">{event.id}</span>
                    <span className="text-lg font-semibold text-verde">{event.core}</span>
                </div>
                <Badge className={`text-[10px] uppercase ${CATEGORY_COLORS[event.category] || 'bg-gray-100 text-gray-700'}`}>
                    {event.category}
                </Badge>
            </div>

            {event.clause && (
                <div className="px-3 py-2 border-t border-areia/30">
                    <p className="text-right text-lg font-serif text-preto" dir="rtl">
                        {event.clause.text}
                    </p>
                    <p className="text-sm text-verde italic mt-1">
                        {event.clause.gloss}
                    </p>
                </div>
            )}

            {event.roles && event.roles.length > 0 && (
                <div className="px-3 py-2 border-t border-areia/30 bg-white/50">
                    <div className="flex items-center gap-1 flex-wrap">
                        <Users className="w-3 h-3 text-verde/60" />
                        {event.roles.map((r, i) => (
                            <span key={i} className="text-xs">
                                <span className="text-verde/60">{r.role}:</span>{' '}
                                <span className="font-medium text-preto">{r.participantGloss}</span>
                                {i < event.roles.length - 1 && <span className="text-areia mx-1">•</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {(event.discourseFunction || event.narrativeFunction) && (
                <div className="px-3 py-2 border-t border-areia/30 flex gap-2">
                    {event.discourseFunction && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            📍 {event.discourseFunction}
                        </span>
                    )}
                    {event.narrativeFunction && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            📖 {event.narrativeFunction}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
