import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI } from '../../services/api'
import { EventCreate, EventResponse, EventRoleBase } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Zap, Plus, Pencil, Trash2, Loader2, User } from 'lucide-react'

const EVENT_CATEGORIES = ['ACTION', 'SPEECH', 'MOTION', 'STATE', 'PROCESS', 'TRANSFER', 'INTERNAL', 'RITUAL', 'META']
const SEMANTIC_ROLES = ['doer', 'undergoer', 'feeler', 'receiver', 'causer', 'beneficiary', 'instrument', 'location', 'goal', 'source', 'time', 'manner']

function Stage4Events() {
    const {
        passageData,
        events,
        setEvents,
        participants,
        loading,
        setLoading,
        error,
        setError,
        trackEdit,
        aiSnapshot
    } = usePassageStore()
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<EventCreate>({
        eventId: '',
        category: 'ACTION',
        eventCore: '',
        roles: []
    })

    useEffect(() => {
        // Only fetch from DB if no events in store (avoid overwriting AI-generated data)
        if (passageData?.id && events.length === 0) {
            fetchEvents(passageData.id)
        }
    }, [passageData?.id])

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
        setFormData({
            eventId: `e${events.length + 1}`,
            category: 'ACTION',
            eventCore: '',
            roles: []
        })
        setEditingId(null)
    }

    const handleCreate = () => {
        resetForm()
        setShowModal(true)
    }

    const handleEdit = (ev: EventResponse) => {
        setFormData({
            eventId: ev.eventId,
            clauseId: ev.clauseId,
            category: ev.category,
            eventCore: ev.eventCore,
            roles: ev.roles
        })
        setEditingId(ev.id)
        setShowModal(true)
    }

    const handleSubmit = async () => {
        if (!passageData?.id) return

        try {
            setLoading(true)
            if (editingId) {
                // Get original for comparison
                const original = events.find(ev => ev.id === editingId)

                // Save to DB
                const updated = await bhsaAPI.updateEvent(editingId, formData)
                setEvents(events.map(ev => ev.id === editingId ? updated : ev))

                // Track changes
                if (aiSnapshot && original) {
                    // Check fields
                    const fields = ['category', 'eventCore'] as const
                    fields.forEach(field => {
                        if (original[field] !== formData[field]) {
                            const wasAiGenerated = aiSnapshot.events?.some((e: any) => e.eventCore === original.eventCore)
                            trackEdit('update', 'event', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })

                    // Track roles changes (simplified: just track count or specific modifications would be redundant with updateRole)
                }
            } else {
                const created = await bhsaAPI.createEvent(passageData.id, formData)
                setEvents([...events, created])

                // Track creation
                if (aiSnapshot) {
                    trackEdit('create', 'event', created.id, undefined, undefined, undefined, false)
                }
            }
            setShowModal(false)
        } catch (err: any) {
            console.error('Error saving event:', err)
            setError(err.response?.data?.detail || 'Failed to save event')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteEvent(id)
            setEvents(events.filter(ev => ev.id !== id))

            // Track deletion
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

    const addRole = () => {
        setFormData({
            ...formData,
            roles: [...formData.roles, { role: 'doer', participantId: null }]
        })
    }

    const updateRole = (index: number, field: keyof EventRoleBase, value: string) => {
        const newRoles = [...formData.roles]
        newRoles[index] = { ...newRoles[index], [field]: value }
        setFormData({ ...formData, roles: newRoles })
    }

    const removeRole = (index: number) => {
        const newRoles = formData.roles.filter((_, i) => i !== index)
        setFormData({ ...formData, roles: newRoles })
    }

    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            ACTION: 'bg-telha/10 text-telha border-telha/20',
            SPEECH: 'bg-azul/20 text-verde border-azul/30',
            MOTION: 'bg-verde-claro/20 text-verde border-verde-claro/30',
            STATE: 'bg-areia/30 text-verde border-areia',
            PROCESS: 'bg-purple-100 text-purple-800 border-purple-200'
        }
        return colors[cat] || 'bg-gray-100 text-gray-800 border-gray-200'
    }

    if (!passageData) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-verde/60">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Please fetch a passage in Stage 1 first.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stage header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-preto flex items-center gap-2">
                        <Zap className="w-6 h-6 text-telha" />
                        Stage 4: Events
                    </h2>
                    <p className="text-verde mt-1">Identify events, classify them, and assign participant roles.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Event
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Events list */}
            <div className="space-y-4">
                {events.map((ev, idx) => (
                    <Card key={ev.id || `ev-${ev.eventId}-${idx}`} className="group">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg font-semibold text-telha">{ev.eventId}</span>
                                        <span className="text-lg font-medium text-preto">{ev.eventCore}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(ev.category)}`}>
                                            {ev.category}
                                        </span>
                                    </div>

                                    {ev.roles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {ev.roles.map((r, i) => {
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
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(ev)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(ev.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {events.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-verde/60">
                        <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No events yet. Click "Add Event" or use AI Analyze in Stage 1.</p>
                    </CardContent>
                </Card>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle>
                        <DialogDescription>Define an event with its category and participant roles.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Event ID</label>
                                <Input
                                    value={formData.eventId}
                                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                    placeholder="e1, e2..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Category</label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EVENT_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Event Core (Concept)</label>
                            <Input
                                value={formData.eventCore}
                                onChange={(e) => setFormData({ ...formData, eventCore: e.target.value })}
                                placeholder="e.g. go, say, create"
                            />
                        </div>

                        {/* Roles section */}
                        <div className="border-t border-areia/30 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-semibold text-preto">Participant Roles</label>
                                <Button type="button" variant="outline" size="sm" onClick={addRole}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Role
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {formData.roles.map((role, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <Select value={role.role} onValueChange={(v) => updateRole(i, 'role', v)}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SEMANTIC_ROLES.map(r => (
                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={role.participantId || ''} onValueChange={(v) => updateRole(i, 'participantId', v)}>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select participant..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {participants.map((p, idx) => (
                                                    <SelectItem key={p.id || `p-${p.participantId}-${idx}`} value={p.participantId}>{p.participantId}: {p.gloss}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeRole(i)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Save Changes' : 'Add Event'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Stage4Events
