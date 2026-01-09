import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI } from '../../services/api'
import { ParticipantResponse, ParticipantCreate } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

const PARTICIPANT_TYPES = ['person', 'group', 'divine', 'animal', 'plant', 'object', 'place', 'abstract', 'time', 'event']

function Stage2Participants() {
    const {
        passageData,
        participants,
        setParticipants,
        loading,
        setLoading,
        error,
        setError,
        trackEdit,
        aiSnapshot
    } = usePassageStore()
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<ParticipantCreate>({
        participantId: '',
        hebrew: '',
        gloss: '',
        type: 'person',
        quantity: 'singular'
    })

    useEffect(() => {
        // Only fetch from DB if no participants in store (avoid overwriting AI-generated data)
        if (passageData?.id && participants.length === 0) {
            fetchParticipants(passageData.id)
        }
    }, [passageData?.id])

    const fetchParticipants = async (passageId: string) => {
        try {
            setLoading(true)
            const data = await bhsaAPI.getParticipants(passageId)
            setParticipants(data)
        } catch (err: any) {
            console.error('Failed to fetch participants:', err)
            setError(err.response?.data?.detail || 'Failed to fetch participants')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            participantId: '',
            hebrew: '',
            gloss: '',
            type: 'person',
            quantity: 'singular'
        })
        setEditingId(null)
    }

    const handleCreate = () => {
        resetForm()
        setFormData(prev => ({ ...prev, participantId: `p${participants.length + 1}` }))
        setShowModal(true)
    }

    const handleEdit = (p: ParticipantResponse) => {
        setFormData({
            participantId: p.participantId,
            hebrew: p.hebrew,
            gloss: p.gloss,
            type: p.type,
            quantity: p.quantity || 'singular'
        })
        setEditingId(p.id)
        setShowModal(true)
    }

    const handleSubmit = async () => {
        if (!passageData?.id) return

        try {
            setLoading(true)
            if (editingId) {
                // Get original for comparison
                const original = participants.find(p => p.id === editingId)

                // Save to DB
                const updated = await bhsaAPI.updateParticipant(editingId, formData)
                setParticipants(participants.map(p => p.id === editingId ? updated : p))

                // Track changes if AI snapshot exists
                if (aiSnapshot && original) {
                    // Check fields
                    const fields = ['hebrew', 'gloss', 'type', 'quantity'] as const
                    fields.forEach(field => {
                        if (original[field] !== formData[field]) {
                            // Check if this participant was in the AI snapshot
                            const wasAiGenerated = aiSnapshot.participants?.some((p: any) => p.hebrew === original.hebrew)
                            trackEdit('update', 'participant', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                }
            } else {
                const created = await bhsaAPI.createParticipant(passageData.id, formData)
                setParticipants([...participants, created])

                // Track creation (not AI generated)
                if (aiSnapshot) {
                    trackEdit('create', 'participant', created.id, undefined, undefined, undefined, false)
                }
            }
            setShowModal(false)
            resetForm()
        } catch (err: any) {
            console.error('Error saving participant:', err)
            setError(err.response?.data?.detail || 'Failed to save participant')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this participant?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteParticipant(id)
            setParticipants(participants.filter(p => p.id !== id))

            // Track deletion
            if (aiSnapshot) {
                const original = participants.find(p => p.id === id)
                const wasAiGenerated = aiSnapshot.participants?.some((p: any) => p.hebrew === original?.hebrew)
                trackEdit('delete', 'participant', id, undefined, undefined, undefined, wasAiGenerated)
            }
        } catch (err: any) {
            console.error('Error deleting participant:', err)
            setError(err.response?.data?.detail || 'Failed to delete participant')
        } finally {
            setLoading(false)
        }
    }

    const getTypeBadgeVariant = (type: string): any => {
        const map: Record<string, string> = {
            divine: 'divine',
            place: 'place',
            time: 'time',
            person: 'person',
            abstract: 'abstract',
            object: 'object',
            group: 'group'
        }
        return map[type] || 'default'
    }

    if (!passageData) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-verde/60">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
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
                        <Users className="w-6 h-6 text-telha" />
                        Stage 2: Participants
                    </h2>
                    <p className="text-verde mt-1">Identify and classify entities in the text.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Participant
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Participants grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((p, index) => (
                    <Card key={p.id || `temp-${p.participantId}-${index}`} className="group hover:border-telha/30 transition-colors">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-telha">{p.participantId}</span>
                                    <Badge variant={getTypeBadgeVariant(p.type)}>{p.type}</Badge>
                                </div>
                                <div className="hebrew-text text-lg">{p.hebrew}</div>
                            </div>
                            <p className="text-preto text-sm italic mb-3">{p.gloss}</p>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(p.id)}>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {participants.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-verde/60">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No participants yet. Click "Add Participant" or use AI Analyze in Stage 1.</p>
                    </CardContent>
                </Card>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Participant' : 'Add Participant'}</DialogTitle>
                        <DialogDescription>
                            Enter the participant details below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">ID</label>
                                <Input
                                    value={formData.participantId}
                                    onChange={(e) => setFormData({ ...formData, participantId: e.target.value })}
                                    placeholder="p1, p2..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Type</label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PARTICIPANT_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Hebrew</label>
                            <Input
                                value={formData.hebrew}
                                onChange={(e) => setFormData({ ...formData, hebrew: e.target.value })}
                                placeholder="Hebrew text"
                                className="text-right"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Gloss (English)</label>
                            <Input
                                value={formData.gloss}
                                onChange={(e) => setFormData({ ...formData, gloss: e.target.value })}
                                placeholder="English translation"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Save Changes' : 'Add Participant'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Stage2Participants
