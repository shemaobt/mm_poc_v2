import { useState, useEffect, useMemo } from 'react'
import { usePassageStore } from '../../../stores/passageStore'
import { bhsaAPI, passagesAPI } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { EventCreate, EventResponse } from '../../../types'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Zap, Plus, Check, CheckCircle2 } from 'lucide-react'
import { EventCard } from './EventCard'
import { EventModal } from './EventModal'
import { EventFormData, SegmentOption } from './types'
import { emptyStateStyles, stageHeaderStyles, errorStateStyles, cardStyles } from '@/styles'

const createEmptyFormData = (eventCount: number): EventFormData => ({
    eventId: `e${eventCount + 1}`,
    category: 'ACTION',
    eventCore: '',
    roles: [],
    modifiers: {},
    speechAct: {},
    pragmatic: {},
    emotions: [],
    narratorStance: {},
    audienceResponse: {},
    laRetrieval: {},
    figurative: {},
    keyTerms: []
})

function Stage4Events() {
    const {
        passageData,
        events,
        readOnly,
        setEvents,
        participants,
        loading,
        setLoading,
        error,
        setError,
        trackEdit,
        aiSnapshot,
        validated,
        toggleValidation,
        validateAll
    } = usePassageStore()

    const { isAdmin } = useAuth()

    const isValidated = (id: string) => validated.events.has(id)
    const validatedCount = events.filter(e => validated.events.has(e.id)).length
    const allValidated = events.length > 0 && events.every(e => validated.events.has(e.id))

    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [dbClauses, setDbClauses] = useState<any[]>([])
    const [formData, setFormData] = useState<EventFormData>(createEmptyFormData(0))
    const [originalData, setOriginalData] = useState<EventCreate | null>(null)

    useEffect(() => {
        if (passageData?.id) {
            fetchDbClauses(passageData.id)
            fetchEvents(passageData.id)
        }
    }, [passageData?.id])

    const fetchDbClauses = async (passageId: string) => {
        try {
            const passage = await passagesAPI.get(passageId)
            if (passage?.clauses) {
                setDbClauses(passage.clauses.sort((a: any, b: any) => {
                    const idxA = typeof a.clauseIndex === 'number' ? a.clauseIndex : 0
                    const idxB = typeof b.clauseIndex === 'number' ? b.clauseIndex : 0
                    return idxA - idxB
                }))
            }
        } catch (err: any) {
            console.error('Failed to fetch DB clauses:', err)
        }
    }

    const segmentOptions: SegmentOption[] = useMemo(() => {
        if (!dbClauses.length) return []
        const units = passageData?.display_units
        if (units?.length && units.every((u: any) => u?.clause_ids?.length)) {
            return units.map((u: any) => {
                const ids = u.clause_ids as number[]
                const firstClauseIndex = ids[0] - 1
                const firstClause = dbClauses.find((c: any) => (c.clauseIndex === firstClauseIndex))
                const firstDbId = firstClause?.id
                const clauseTexts = dbClauses
                    .filter((c: any) => ids.includes((c.clauseIndex ?? 0) + 1))
                    .map((c: any) => c.text)
                const label =
                    ids.length > 1
                        ? `${ids[0]}-${ids[ids.length - 1]}: ${clauseTexts.join(' ')}`
                        : `${ids[0]}: ${clauseTexts[0] || ''}`
                return { value: firstDbId, label }
            }).filter((o: { value: string }) => o.value)
        }
        return dbClauses.map((c: any) => ({
            value: c.id,
            label: `${(typeof c.clauseIndex === 'number' ? c.clauseIndex + 1 : c.clauseIndex)}: ${c.text}`,
        }))
    }, [dbClauses, passageData?.display_units])

    const fetchEvents = async (passageId: string) => {
        try {
            setLoading(true)
            const data = await bhsaAPI.getEvents(passageId)
            setEvents(data)
        } catch (err: any) {
            console.error('Failed to fetch events:', err)
            setError(err.response?.data?.detail || 'Failed to fetch events')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData(createEmptyFormData(events.length))
        setEditingId(null)
    }

    const handleCreate = () => {
        if (readOnly) return
        resetForm()
        setShowModal(true)
    }

    const handleEdit = (ev: EventResponse) => {
        if (readOnly) return
        const roles = (ev.roles || []).map((r) => {
            if (!r.participantId) return r
            const byLogical = participants.find((p) => p.participantId === r.participantId)
            if (byLogical) return r
            const byId = participants.find((p) => p.id === r.participantId)
            return byId ? { ...r, participantId: byId.participantId } : r
        })
        const eventData: EventFormData = {
            eventId: ev.eventId,
            clauseId: ev.clauseId,
            category: ev.category,
            eventCore: ev.eventCore,
            discourseFunction: ev.discourseFunction,
            chainPosition: ev.chainPosition,
            narrativeFunction: ev.narrativeFunction,
            roles,
            modifiers: ev.modifiers || {},
            speechAct: ev.speechAct || {},
            pragmatic: ev.pragmatic || {},
            emotions: ev.emotions || [],
            narratorStance: ev.narratorStance || {},
            audienceResponse: ev.audienceResponse || {},
            laRetrieval: ev.laRetrieval || {},
            figurative: ev.figurative || {},
            keyTerms: ev.keyTerms || []
        }
        setFormData(eventData)
        setOriginalData(JSON.parse(JSON.stringify(eventData)))
        setEditingId(ev.id)
        setShowModal(true)
    }

    const computeDelta = (original: EventCreate | null, current: EventCreate): Partial<EventCreate> => {
        if (!original) return current

        const delta: Partial<EventCreate> = {}

        if (current.category !== original.category) delta.category = current.category
        if (current.eventCore !== original.eventCore) delta.eventCore = current.eventCore
        if (current.discourseFunction !== original.discourseFunction) delta.discourseFunction = current.discourseFunction
        if (current.chainPosition !== original.chainPosition) delta.chainPosition = current.chainPosition
        if (current.narrativeFunction !== original.narrativeFunction) delta.narrativeFunction = current.narrativeFunction

        if (JSON.stringify(current.roles) !== JSON.stringify(original.roles)) delta.roles = current.roles
        if (JSON.stringify(current.modifiers) !== JSON.stringify(original.modifiers)) delta.modifiers = current.modifiers
        if (JSON.stringify(current.speechAct) !== JSON.stringify(original.speechAct)) delta.speechAct = current.speechAct
        if (JSON.stringify(current.pragmatic) !== JSON.stringify(original.pragmatic)) delta.pragmatic = current.pragmatic
        if (JSON.stringify(current.emotions) !== JSON.stringify(original.emotions)) delta.emotions = current.emotions
        if (JSON.stringify(current.narratorStance) !== JSON.stringify(original.narratorStance)) delta.narratorStance = current.narratorStance
        if (JSON.stringify(current.audienceResponse) !== JSON.stringify(original.audienceResponse)) delta.audienceResponse = current.audienceResponse
        if (JSON.stringify(current.laRetrieval) !== JSON.stringify(original.laRetrieval)) delta.laRetrieval = current.laRetrieval
        if (JSON.stringify(current.figurative) !== JSON.stringify(original.figurative)) delta.figurative = current.figurative
        if (JSON.stringify(current.keyTerms) !== JSON.stringify(original.keyTerms)) delta.keyTerms = current.keyTerms

        return delta
    }

    const handleSubmit = async () => {
        if (!passageData?.id) return
        if (loading) return

        try {
            setLoading(true)
            if (editingId) {
                const delta = computeDelta(originalData, formData)
                const hasChanges = Object.keys(delta).length > 0

                let updated
                if (hasChanges) {
                    updated = await bhsaAPI.patchEvent(editingId, delta)
                } else {
                    setShowModal(false)
                    return
                }
                const idToUpdate = editingId
                setEvents((prevEvents: EventResponse[]) => {
                    const prev = prevEvents.find((ev: EventResponse) => ev.id === idToUpdate)
                    const merged = prev
                        ? {
                            ...updated,
                            clauseId: updated.clauseId ?? prev.clauseId,
                            unitClauseIds: updated.unitClauseIds ?? prev.unitClauseIds,
                        }
                        : updated
                    return prevEvents.map((ev: EventResponse) => (ev.id === idToUpdate ? merged : ev))
                })

                if (aiSnapshot) {
                    const original = events.find(ev => ev.id === editingId)
                    const fields = ['category', 'eventCore', 'discourseFunction', 'narrativeFunction'] as const
                    fields.forEach(field => {
                        if (original && original[field] !== formData[field]) {
                            const wasAiGenerated = aiSnapshot.events?.some((e: any) => e.eventCore === original.eventCore)
                            trackEdit('update', 'event', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                }
            } else {
                const created = await bhsaAPI.createEvent(passageData.id, formData)
                setEvents((prev: EventResponse[]) => [...prev, created])

                if (aiSnapshot) {
                    trackEdit('create', 'event', created.id, undefined, undefined, undefined, false)
                }
            }
            setShowModal(false)
            setOriginalData(null)
        } catch (err: any) {
            console.error('Error saving event:', err)
            setError(err.response?.data?.detail || err.message || 'Failed to save event')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteEvent(id)
            setEvents((prev: EventResponse[]) => prev.filter((ev: EventResponse) => ev.id !== id))

            if (aiSnapshot) {
                const original = events.find(ev => ev.id === id)
                const wasAiGenerated = aiSnapshot.events?.some((e: any) => e.eventCore === original?.eventCore)
                trackEdit('delete', 'event', id, undefined, undefined, undefined, wasAiGenerated)
            }
        } catch (err: any) {
            console.error('Error deleting event:', err)
            setError(err.response?.data?.detail || 'Failed to delete event')
        } finally {
            setLoading(false)
        }
    }

    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            const numA = parseInt(a.eventId.replace(/^e/, ''), 10) || 0
            const numB = parseInt(b.eventId.replace(/^e/, ''), 10) || 0
            return numA - numB
        })
    }, [events])

    if (!passageData) {
        return (
            <Card className={cardStyles.dashed}>
                <CardContent className={emptyStateStyles.container}>
                    <Zap className={emptyStateStyles.icon} />
                    <p>Please fetch a passage in Stage 1 first.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className={stageHeaderStyles.title}>
                        <Zap className={stageHeaderStyles.icon} />
                        Stage 4: Events
                    </h2>
                    <p className={stageHeaderStyles.description}>Identify events, classify them, and assign participant roles.</p>
                </div>
                {!readOnly && (
                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Event
                    </Button>
                )}
            </div>

            {error && (
                <div className={errorStateStyles.banner}>
                    {error}
                </div>
            )}

            {events.length > 0 && (
                <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                        <span className="text-sm text-preto">
                            <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{events.length}</span> events validated
                        </span>
                        {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
                    </div>
                    {!readOnly && isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateAll('events', events.map(e => e.id))}
                            disabled={allValidated}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Validate All
                        </Button>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {sortedEvents.map((ev, idx) => (
                    <EventCard
                        key={ev.id || `ev-${ev.eventId}-${idx}`}
                        event={ev}
                        participants={participants}
                        passageData={passageData}
                        dbClauses={dbClauses}
                        isValidated={isValidated(ev.id)}
                        readOnly={readOnly}
                        onValidate={() => toggleValidation('events', ev.id)}
                        onEdit={() => handleEdit(ev)}
                        onDelete={() => handleDelete(ev.id)}
                    />
                ))}
            </div>

            {events.length === 0 && (
                <Card className={cardStyles.dashed}>
                    <CardContent className={emptyStateStyles.container}>
                        <Zap className={emptyStateStyles.icon} />
                        <p>No events yet. Click "Add Event" or use AI Analyze in Stage 1.</p>
                    </CardContent>
                </Card>
            )}

            <EventModal
                open={showModal}
                onOpenChange={setShowModal}
                formData={formData}
                setFormData={setFormData}
                participants={participants}
                segmentOptions={segmentOptions}
                editingId={editingId}
                loading={loading}
                error={error}
                onSubmit={handleSubmit}
            />
        </div>
    )
}

export default Stage4Events
