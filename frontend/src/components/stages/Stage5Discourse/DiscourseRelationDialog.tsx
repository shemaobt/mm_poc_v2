import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog'
import { Loader2 } from 'lucide-react'
import { CreatableSelect } from '../../ui/creatable-select'
import { DiscourseRelationCreate, EventResponse } from '../../../types'
import { DISCOURSE_RELATIONS_FALLBACK } from './constants'

interface DiscourseRelationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formData: DiscourseRelationCreate
    onFormChange: (data: DiscourseRelationCreate) => void
    events: EventResponse[]
    loading: boolean
    isEditing: boolean
    onSubmit: () => void
}

function sortEventsByIdNumeric(events: EventResponse[]) {
    return [...events].sort((a, b) => {
        const getNum = (id: string) => {
            const match = id.match(/^e(\d+)$/)
            return match ? parseInt(match[1]) : Infinity
        }
        const numA = getNum(a.eventId)
        const numB = getNum(b.eventId)
        if (numA !== Infinity && numB !== Infinity) return numA - numB
        return a.eventId.localeCompare(b.eventId, undefined, { numeric: true })
    })
}

export function DiscourseRelationDialog({
    open,
    onOpenChange,
    formData,
    onFormChange,
    events,
    loading,
    isEditing,
    onSubmit
}: DiscourseRelationDialogProps) {
    const sortedEvents = sortEventsByIdNumeric(events)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Discourse Relation' : 'New Discourse Relation'}</DialogTitle>
                    <DialogDescription>Connect two events with a semantic relationship.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">Source Event</label>
                        <Select
                            value={formData.sourceId || '__na__'}
                            onValueChange={(v) => onFormChange({ ...formData, sourceId: v === '__na__' ? '' : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select event..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                                {sortedEvents.map((ev, idx) => (
                                    <SelectItem key={ev.id || `ev-${ev.eventId}-${idx}`} value={ev.id || ev.eventId}>
                                        {ev.eventId}: {ev.eventCore} ({ev.category})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">Relation Type</label>
                        <CreatableSelect
                            category="discourse_relation"
                            value={formData.relationType}
                            onValueChange={(v) => onFormChange({ ...formData, relationType: v })}
                            placeholder="Select relation type..."
                            fallbackOptions={DISCOURSE_RELATIONS_FALLBACK}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">Target Event</label>
                        <Select
                            value={formData.targetId || '__na__'}
                            onValueChange={(v) => onFormChange({ ...formData, targetId: v === '__na__' ? '' : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select event..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                                {sortedEvents.map((ev, idx) => (
                                    <SelectItem key={ev.id || `ev-${ev.eventId}-${idx}`} value={ev.id || ev.eventId}>
                                        {ev.eventId}: {ev.eventCore} ({ev.category})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {isEditing ? 'Update Relation' : 'Create Relation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
