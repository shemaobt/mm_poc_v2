import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { ParticipantResponse, ParticipantCreate } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Users, Plus, Pencil, Trash2, Loader2, Check, CheckCircle2 } from 'lucide-react'
import { CreatableSelect } from '../ui/creatable-select'

// Fallback options (used while loading or if API fails)
const PARTICIPANT_TYPES_FALLBACK = [
    { value: 'person', label: 'Person' },
    { value: 'group', label: 'Group' },
    { value: 'divine', label: 'Divine' },
    { value: 'animal', label: 'Animal' },
    { value: 'place', label: 'Place' },
    { value: 'object', label: 'Object' },
    { value: 'abstract', label: 'Abstract' },
]
const QUANTITIES_FALLBACK = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
    { value: 'few', label: 'Few' },
    { value: 'many', label: 'Many' },
    { value: 'all', label: 'All' },
    { value: 'mass', label: 'Mass' },
    { value: 'unknown', label: 'Unknown' },
]
const REFERENCE_STATUS_FALLBACK = [
    { value: 'new_mention', label: 'New Mention' },
    { value: 'known', label: 'Known' },
    { value: 'pointed', label: 'Pointed' },
    { value: 'kind', label: 'Kind' },
]
const PROPERTY_DIMENSIONS_FALLBACK = [
    { value: 'color', label: 'Color' },
    { value: 'size', label: 'Size' },
    { value: 'age', label: 'Age' },
    { value: 'condition', label: 'Condition' },
    { value: 'value', label: 'Value' },
    { value: 'character', label: 'Character' },
    { value: 'social_status', label: 'Social Status' },
    { value: 'physical_state', label: 'Physical State' },
    { value: 'emotional_state', label: 'Emotional State' },
]

function Stage2Participants() {
    const {
        passageData,
        readOnly,
        participants,
        setParticipants,
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

    // Validation helpers
    const isValidated = (id: string) => validated.participants.has(id)
    const validatedCount = participants.filter(p => validated.participants.has(p.id)).length
    const allValidated = participants.length > 0 && participants.every(p => validated.participants.has(p.id))
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<ParticipantCreate>({
        participantId: '',
        hebrew: '',
        gloss: '',
        type: 'person',
        quantity: 'one',
        referenceStatus: 'new_mention',
        properties: []
    })

    // Property adding state
    const [newPropDimension, setNewPropDimension] = useState<string>('')
    const [newPropValue, setNewPropValue] = useState<string>('')

    useEffect(() => {
        // Always fetch fresh data from DB when stage mounts to ensure consistency
        if (passageData?.id) {
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
            quantity: 'one',
            referenceStatus: 'new_mention',
            properties: []
        })
        setEditingId(null)
        setNewPropDimension('')
        setNewPropValue('')
    }

    const handleCreate = () => {
        resetForm()
        setFormData(prev => ({ ...prev, participantId: `p${participants.length + 1}` }))
        if (readOnly) return
        setShowModal(true)
    }

    const handleEdit = (p: ParticipantResponse) => {
        if (readOnly) return
        setFormData({
            participantId: p.participantId,
            hebrew: p.hebrew,
            gloss: p.gloss,
            type: p.type ?? '',
            quantity: p.quantity ?? '',
            referenceStatus: p.referenceStatus ?? '',
            properties: p.properties || []
        })
        setEditingId(p.id)
        setShowModal(true)
    }

    const addProperty = () => {
        if (newPropDimension && newPropValue) {
            setFormData(prev => ({
                ...prev,
                properties: [...(prev.properties || []), { dimension: newPropDimension, value: newPropValue }]
            }))
            setNewPropDimension('')
            setNewPropValue('')
        }
    }

    const removeProperty = (index: number) => {
        setFormData(prev => ({
            ...prev,
            properties: (prev.properties || []).filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async () => {
        if (!passageData?.id) return

        try {
            setLoading(true)
            if (editingId) {
                // Get original for comparison (from closure; tracking uses it)
                const original = participants.find(p => p.id === editingId)

                // Save to DB
                console.log('Sending update:', formData)
                const updated = await bhsaAPI.updateParticipant(editingId, formData)
                // Functional update + merge so fields not returned by API are preserved
                const idToUpdate = editingId
                setParticipants((prev: ParticipantResponse[]) => {
                    const prevItem = prev.find((p: ParticipantResponse) => p.id === idToUpdate)
                    const merged = prevItem ? { ...prevItem, ...updated } : updated
                    return prev.map((p: ParticipantResponse) => (p.id === idToUpdate ? merged : p))
                })

                // Track changes if AI snapshot exists
                if (aiSnapshot && original) {
                    // Check fields
                    const fields = ['hebrew', 'gloss', 'type', 'quantity', 'referenceStatus'] as const
                    fields.forEach(field => {
                        if (original[field] !== formData[field]) {
                            // Check if this participant was in the AI snapshot
                            const wasAiGenerated = aiSnapshot.participants?.some((p: any) => p.hebrew === original.hebrew)
                            trackEdit('update', 'participant', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                    // TODO: Deep compare properties tracking
                }
            } else {
                const created = await bhsaAPI.createParticipant(passageData.id, formData)
                setParticipants((prev: ParticipantResponse[]) => [...prev, created])

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
            setParticipants((prev: ParticipantResponse[]) => prev.filter((p: ParticipantResponse) => p.id !== id))

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
                {!readOnly && (
                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Participant
                    </Button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Validation summary */}
            {participants.length > 0 && (
                <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                        <span className="text-sm text-preto">
                            <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{participants.length}</span> participants validated
                        </span>
                        {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
                    </div>
                    {!readOnly && isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateAll('participants', participants.map(p => p.id))}
                            disabled={allValidated}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Validate All
                        </Button>
                    )}
                </div>
            )}

            {/* Participants grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...participants].sort((a, b) => {
                    // Sort by numeric part of ID (p1, p2, ... p10)
                    const getNum = (id: string) => {
                        const match = id.match(/^p(\d+)$/);
                        return match ? parseInt(match[1]) : Infinity;
                    };
                    const numA = getNum(a.participantId);
                    const numB = getNum(b.participantId);

                    if (numA !== Infinity && numB !== Infinity) {
                        return numA - numB;
                    }
                    // Fallback to string comparison for non-standard IDs
                    return a.participantId.localeCompare(b.participantId, undefined, { numeric: true });
                }).map((p, index) => (
                    <Card
                        key={p.id || `temp-${p.participantId}-${index}`}
                        className={`group transition-all ${isValidated(p.id) ? 'border-verde-claro/50 bg-verde-claro/5' : 'hover:border-telha/30'}`}
                    >
                        <CardContent className="p-4">
                            {/* Validation checkbox - hidden in read-only */}
                            {!readOnly && (
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => toggleValidation('participants', p.id)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${isValidated(p.id)
                                            ? 'bg-verde-claro/20 text-verde-claro'
                                            : 'bg-areia/30 text-areia hover:bg-areia/50'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isValidated(p.id)
                                            ? 'border-verde-claro bg-verde-claro'
                                            : 'border-areia'
                                            }`}>
                                            {isValidated(p.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-xs font-medium">
                                            {isValidated(p.id) ? 'Validated' : 'Click to validate'}
                                        </span>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-telha">{p.participantId}</span>
                                    <Badge variant={getTypeBadgeVariant(p.type)}>{p.type || 'N/A'}</Badge>
                                </div>
                                <div className="hebrew-text text-lg">{p.hebrew}</div>
                            </div>
                            <p className="text-preto text-sm italic mb-2">{p.gloss}</p>

                            {/* Tags for details */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                <Badge variant="default" className="text-xs border-preto/20">{p.quantity || 'N/A'}</Badge>
                                <Badge variant="default" className="text-xs border-preto/20">{p.referenceStatus || 'N/A'}</Badge>
                                {p.properties?.map((prop, i) => (
                                    <Badge key={i} variant="default" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                                        {prop.dimension}: {prop.value}
                                    </Badge>
                                ))}
                            </div>

                            {!readOnly && (
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
                            )}
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
                <DialogContent className="max-w-2xl">
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
                                <CreatableSelect
                                    category="participant_type"
                                    value={formData.type}
                                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                                    placeholder="Select type..."
                                    fallbackOptions={PARTICIPANT_TYPES_FALLBACK}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Quantity</label>
                                <CreatableSelect
                                    category="quantity"
                                    value={formData.quantity}
                                    onValueChange={(v) => setFormData({ ...formData, quantity: v })}
                                    placeholder="Select quantity..."
                                    fallbackOptions={QUANTITIES_FALLBACK}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Reference Status</label>
                                <CreatableSelect
                                    category="reference_status"
                                    value={formData.referenceStatus}
                                    onValueChange={(v) => setFormData({ ...formData, referenceStatus: v })}
                                    placeholder="Select status..."
                                    fallbackOptions={REFERENCE_STATUS_FALLBACK}
                                />
                            </div>
                        </div>

                        {/* Properties Section */}
                        <div className="border-t pt-4">
                            <label className="text-sm font-medium text-preto mb-2 block">Properties</label>

                            {/* Existing Properties */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.properties?.map((prop, index) => (
                                    <Badge key={index} variant="default" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-200">
                                        <span>{prop.dimension}: {prop.value}</span>
                                        <button onClick={() => removeProperty(index)} className="hover:text-red-500 rounded-full p-0.5">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                                {(!formData.properties || formData.properties.length === 0) && (
                                    <span className="text-sm text-gray-400 italic">No properties added</span>
                                )}
                            </div>

                            {/* Add Property Controls */}
                            <div className="flex gap-2 items-end">
                                <div className="w-1/3">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Dimension</label>
                                    <CreatableSelect
                                        category="property_dimension"
                                        value={newPropDimension}
                                        onValueChange={(v) => { setNewPropDimension(v); setNewPropValue('') }}
                                        placeholder="Select..."
                                        includeNA={false}
                                        fallbackOptions={PROPERTY_DIMENSIONS_FALLBACK}
                                        className="h-8"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Value</label>
                                    <CreatableSelect
                                        category={newPropDimension ? `property_${newPropDimension}` : 'property_color'}
                                        value={newPropValue}
                                        onValueChange={setNewPropValue}
                                        placeholder="Select..."
                                        includeNA={false}
                                        disabled={!newPropDimension}
                                        className="h-8"
                                    />
                                </div>
                                <Button size="sm" variant="secondary" onClick={addProperty} disabled={!newPropDimension || !newPropValue} className="h-8">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
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
