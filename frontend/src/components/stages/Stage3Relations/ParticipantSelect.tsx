import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { ParticipantSelectProps } from './types'

function sortParticipants<T extends { participantId: string }>(participants: T[]): T[] {
    return [...participants].sort((a, b) => {
        const getNum = (id: string) => {
            const match = id.match(/^p(\d+)$/)
            return match ? parseInt(match[1]) : Infinity
        }
        const numA = getNum(a.participantId)
        const numB = getNum(b.participantId)
        if (numA !== Infinity && numB !== Infinity) return numA - numB
        return a.participantId.localeCompare(b.participantId, undefined, { numeric: true })
    })
}

export function ParticipantSelect({ value, participants, placeholder, onValueChange }: ParticipantSelectProps) {
    const handleChange = (v: string) => {
        onValueChange(v === '__na__' ? '' : v)
    }

    return (
        <Select value={value || '__na__'} onValueChange={handleChange}>
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                {sortParticipants(participants).map((p, idx) => (
                    <SelectItem 
                        key={p.id || `p-${p.participantId}-${idx}`} 
                        value={p.id || p.participantId}
                    >
                        {p.participantId}: {p.gloss}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
