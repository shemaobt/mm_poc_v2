import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { ParticipantResponse, ParticipantCreate } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Users, Plus, Pencil, Trash2, Loader2, Check, CheckCircle2 } from 'lucide-react'

// Extended to include AI-generated variations
const PARTICIPANT_TYPES = [
    'person', 'group', 'divine', 'animal', 'plant', 'object', 'place', 'abstract', 'time', 'event',
    // Extended types the AI may generate
    'collective_human', 'collective', 'human', 'thing', 'stuff', 'time_entity', 'idea', 'location',
    'deity', 'entity', 'concept', 'material', 'substance', 'structure', 'building'
]
const QUANTITIES = [
    'one', 'two', 'few', 'many', 'all', 'mass', 'unknown',
    // Extended quantities the AI may generate
    'unified_set', 'collective', 'dual', 'plural', 'singular', 'pair', 'multiple', 'some', 'none'
]
const REFERENCE_STATUS = [
    'new_mention', 'known', 'pointed', 'kind',
    // Extended statuses the AI may generate (including short forms)
    'new', 'old', 'given', 'accessible', 'inferrable', 'brand_new', 'unused', 'active', 'semi_active'
]
const PROPERTY_DIMENSIONS: Record<string, string[]> = {
    "color": ["red", "blue", "green", "yellow", "black", "white", "brown", "golden", "purple", "gray", "scarlet", "crimson"],
    "size": ["big", "small", "tall", "short", "long", "wide", "narrow", "thick", "thin", "huge", "tiny"],
    "age": ["old", "young", "new", "ancient", "fresh"],
    "condition": ["wet", "dry", "clean", "dirty", "broken", "whole", "ripe", "rotten", "alive", "dead", "healthy", "sick", "injured", "tired", "empty", "full"],
    "value": ["good", "bad", "beautiful", "ugly", "holy", "unclean", "righteous", "wicked", "precious", "worthless", "pure", "impure"],
    "character": ["wise", "foolish", "kind", "cruel", "brave", "cowardly", "faithful", "treacherous", "humble", "proud", "honest", "generous", "selfish", "patient", "just"],
    "social_status": ["rich", "poor", "powerful", "weak", "honored", "despised", "noble", "common", "free", "slave"],
    "physical_state": ["strong", "weak", "beautiful", "plain", "blind", "deaf", "lame", "barren", "fertile"],
    "emotional_state": ["happy", "sad", "angry", "afraid", "peaceful", "anxious", "hopeful", "despairing"],
    "shape": [],
    // Extended dimensions for AI-generated properties
    "unity": ["unified", "divided", "scattered", "one", "many"],
    "language": ["one_language", "many_languages", "same_language", "different_languages"],
    "function": ["communication", "speech_content", "material", "structural", "ceremonial", "religious"],
    "terrain": ["flat_plain", "mountain", "valley", "river", "desert", "plain", "hill", "coastal"],
    "region": ["Mesopotamia", "Canaan", "Egypt", "Babylon", "Shinar", "Assyria", "Persia"],
    "direction": ["east", "west", "north", "south", "up", "down"],
    "material": ["stone", "brick", "clay", "wood", "metal", "gold", "silver", "bronze", "iron"],
    "purpose": ["dwelling", "worship", "defense", "storage", "monument"]
}

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
        setShowModal(true)
    }

    const handleEdit = (p: ParticipantResponse) => {
        setFormData({
            participantId: p.participantId,
            hebrew: p.hebrew,
            gloss: p.gloss,
            type: p.type,
            quantity: p.quantity || 'one',
            referenceStatus: p.referenceStatus || 'new_mention',
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
                // Get original for comparison
                const original = participants.find(p => p.id === editingId)

                // Save to DB
                console.log('Sending update:', formData)
                const updated = await bhsaAPI.updateParticipant(editingId, formData)
                setParticipants(participants.map(p => p.id === editingId ? updated : p))

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
                    {isAdmin && (
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
                            {/* Validation checkbox */}
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

                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-telha">{p.participantId}</span>
                                    <Badge variant={getTypeBadgeVariant(p.type)}>{p.type}</Badge>
                                </div>
                                <div className="hebrew-text text-lg">{p.hebrew}</div>
                            </div>
                            <p className="text-preto text-sm italic mb-2">{p.gloss}</p>

                            {/* Tags for details */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {p.quantity && <Badge variant="default" className="text-xs border-preto/20">{p.quantity}</Badge>}
                                {p.referenceStatus && <Badge variant="default" className="text-xs border-preto/20">{p.referenceStatus}</Badge>}
                                {p.properties?.map((prop, i) => (
                                    <Badge key={i} variant="default" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                                        {prop.dimension}: {prop.value}
                                    </Badge>
                                ))}
                            </div>

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
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v === '__clear__' ? '' : v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                        {PARTICIPANT_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                <Select value={formData.quantity} onValueChange={(v) => setFormData({ ...formData, quantity: v === '__clear__' ? '' : v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                        {QUANTITIES.map(q => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Reference Status</label>
                                <Select value={formData.referenceStatus} onValueChange={(v) => setFormData({ ...formData, referenceStatus: v === '__clear__' ? '' : v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                        {REFERENCE_STATUS.map(r => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <Select value={newPropDimension} onValueChange={(v) => { setNewPropDimension(v); setNewPropValue('') }}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(PROPERTY_DIMENSIONS).map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Value</label>
                                    <Select value={newPropValue} onValueChange={setNewPropValue} disabled={!newPropDimension}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {newPropDimension && PROPERTY_DIMENSIONS[newPropDimension]?.map(v => (
                                                <SelectItem key={v} value={v}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
