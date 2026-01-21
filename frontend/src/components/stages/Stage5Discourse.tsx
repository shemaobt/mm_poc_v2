import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI, mapsAPI, passagesAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { DiscourseRelationCreate, DiscourseRelationResponse } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { MessageSquare, ArrowRight, Plus, Trash2, Loader2, Save, CheckCircle, Users, Zap, Check, CheckCircle2, Pencil } from 'lucide-react'

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
    ACTION: 'bg-red-100 text-red-700 border-red-200',
    MOTION: 'bg-blue-100 text-blue-700 border-blue-200',
    STATE: 'bg-purple-100 text-purple-700 border-purple-200',
    SPEECH: 'bg-green-100 text-green-700 border-green-200',
    TRANSFER: 'bg-orange-100 text-orange-700 border-orange-200',
    INTERNAL: 'bg-pink-100 text-pink-700 border-pink-200',
    PROCESS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    RITUAL: 'bg-amber-100 text-amber-700 border-amber-200',
    META: 'bg-gray-100 text-gray-700 border-gray-200',
}

const DISCOURSE_RELATIONS = [
    { value: 'sequence', label: 'Sequence (and then)' },
    { value: 'simultaneous', label: 'Simultaneous (while)' },
    { value: 'cause', label: 'Cause (because)' },
    { value: 'result', label: 'Result (therefore)' },
    { value: 'purpose', label: 'Purpose (in order to)' },
    { value: 'condition', label: 'Condition (if)' },
    { value: 'concession', label: 'Concession (although)' },
    { value: 'contrast', label: 'Contrast (but)' },
    { value: 'explanation', label: 'Explanation (that is)' },
    { value: 'elaboration', label: 'Elaboration' },
    { value: 'background', label: 'Background' },
    { value: 'setting', label: 'Setting' }
]

function Stage5Discourse() {
    const {
        passageData,
        discourse,
        setDiscourse,
        events,
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

    // Validation helpers
    const isValidated = (id: string) => validated.discourse.has(id)
    const validatedCount = discourse.filter(d => validated.discourse.has(d.id)).length
    const allValidated = discourse.length > 0 && discourse.every(d => validated.discourse.has(d.id))
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    // DB clauses with UUIDs - needed to match event.clauseId to actual clause data
    const [dbClauses, setDbClauses] = useState<any[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<DiscourseRelationCreate>({
        relationType: 'sequence',
        sourceId: '',
        targetId: ''
    })

    useEffect(() => {
        if (passageData?.id) {
            // Fetch DB clauses for clause matching
            fetchDbClauses(passageData.id)
            // Only fetch from DB if no discourse in store (avoid overwriting AI-generated data)
            if (discourse.length === 0) {
                fetchDiscourse(passageData.id)
            }
        }
    }, [passageData?.id])

    const fetchDbClauses = async (passageId: string) => {
        try {
            const passage = await passagesAPI.get(passageId)
            if (passage?.clauses) {
                setDbClauses(passage.clauses)
            }
        } catch (err: any) {
            console.error('Failed to fetch DB clauses:', err)
        }
    }

    const fetchDiscourse = async (passageId: string) => {
        try {
            setLoading(true)
            const data = await bhsaAPI.getDiscourse(passageId)
            setDiscourse(data)
        } catch (err: any) {
            console.error('Failed to fetch discourse:', err)
            setError(err.response?.data?.detail || 'Failed to fetch discourse')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setFormData({
            relationType: 'sequence',
            sourceId: events[0]?.id || '',
            targetId: events[1]?.id || ''
        })
        setEditingId(null)
        setShowModal(true)
    }

    const handleEdit = (d: DiscourseRelationResponse) => {
        setFormData({
            relationType: d.relationType,
            sourceId: d.sourceId,
            targetId: d.targetId
        })
        setEditingId(d.id)
        setShowModal(true)
    }

    const handleSubmit = async () => {
        if (!passageData?.id) return

        if (!formData.sourceId || !formData.targetId) {
            alert('Please select both source and target events')
            return
        }

        try {
            setLoading(true)
            if (editingId) {
                const updated = await bhsaAPI.updateDiscourse(editingId, formData)
                setDiscourse(discourse.map((d: DiscourseRelationResponse) => d.id === editingId ? updated : d))

                // Track update
                if (aiSnapshot) {
                    const original = discourse.find(d => d.id === editingId)
                    const fields = ['relationType', 'sourceId', 'targetId'] as const
                    fields.forEach(field => {
                        if (original && original[field] !== formData[field]) {
                            const wasAiGenerated = aiSnapshot.discourse?.some((d: any) => d.relationType === original.relationType)
                            trackEdit('update', 'discourse', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                }
            } else {
                const created = await bhsaAPI.createDiscourse(passageData.id, formData)
                setDiscourse([...discourse, created])

                // Track creation
                if (aiSnapshot) {
                    trackEdit('create', 'discourse', created.id, undefined, undefined, undefined, false)
                }
            }

            setShowModal(false)
        } catch (err: any) {
            console.error('Error saving discourse relation:', err)
            setError(err.response?.data?.detail || 'Failed to save discourse relation')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this relation?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteDiscourse(id)
            setDiscourse(discourse.filter(d => d.id !== id))

            // Track deletion
            if (aiSnapshot) {
                const original = discourse.find(d => d.id === id)
                // Try to infer if it was AI generated by properties
                let wasAiGenerated = false
                if (aiSnapshot.discourse && original) {
                    wasAiGenerated = aiSnapshot.discourse.some((d: any) =>
                        d.relationType === original.relationType &&
                        // Matching source/target by ID is tricky in snapshot vs DB, could match logic if needed 
                        // For now we assume if we have a match on type it *might* be it, 
                        // but ideally we'd need better matching logic if IDs drift.
                        // However, simpler is tracking deletion of ANY object in an AI session.
                        true
                    )
                }
                trackEdit('delete', 'discourse', id, undefined, undefined, undefined, wasAiGenerated)
            }
        } catch (err: any) {
            console.error('Error deleting discourse relation:', err)
            setError(err.response?.data?.detail || 'Failed to delete discourse relation')
        } finally {
            setLoading(false)
        }
    }

    const getEventDisplay = (eventId: string) => {
        // Look up by id (UUID) or eventId (e.g. "e1", "e2")
        const ev = events.find(e => e.id === eventId || e.eventId === eventId)
        if (!ev) return { id: eventId, core: 'Unknown', category: 'ACTION', clause: null, roles: [] }

        // Find the associated clause from DB clauses (event.clauseId is a UUID)
        const dbClause = dbClauses.find(c => c.id === ev.clauseId)
        // Also try matching with BHSA clause via clauseIndex for display
        const bhsaClause = dbClause
            ? passageData?.clauses?.find(c => c.clause_id === dbClause.clauseIndex)
            : null

        // Use DB clause data first, fall back to BHSA clause
        const clause = dbClause ? {
            text: dbClause.text,
            gloss: dbClause.gloss || bhsaClause?.gloss,
            freeTranslation: dbClause.freeTranslation || bhsaClause?.freeTranslation
        } : null

        // Get role information with participant names - filter out empty roles
        const roles = (ev.roles || [])
            .map(role => {
                const participant = participants.find(p =>
                    p.id === role.participantId || p.participantId === role.participantId
                )
                const gloss = participant?.gloss || role.participantId
                return {
                    role: role.role,
                    participantId: role.participantId,
                    participantGloss: gloss
                }
            })
            .filter(role => role.participantGloss && role.participantGloss.trim() !== '')

        return {
            id: ev.eventId,
            core: ev.eventCore,
            category: ev.category || 'ACTION',
            discourseFunction: ev.discourseFunction,
            narrativeFunction: ev.narrativeFunction,
            clause,
            roles
        }
    }

    const handleFinalize = async () => {
        if (!passageData?.id) {
            console.error('Cannot finalize: passageData.id is missing', passageData)
            toast.error('Error: No active passage found', {
                description: 'Please go back to Stage 1 and load a passage to continue.'
            })
            return
        }
        try {
            setSaving(true)
            await mapsAPI.finalizePassage(passageData.id)
            setSaved(true)
        } catch (err: any) {
            console.error('Error finalizing passage:', err)
            setError(err.response?.data?.detail || 'Failed to save analysis')
        } finally {
            setSaving(false)
        }
    }

    if (!passageData) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-verde/60">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
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
                        <MessageSquare className="w-6 h-6 text-telha" />
                        Stage 5: Discourse
                    </h2>
                    <p className="text-verde mt-1">Define high-level structure and relationships between events.</p>
                </div>
                <Button onClick={handleCreate} disabled={events.length < 2} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Relation
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Validation summary */}
            {discourse.length > 0 && (
                <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                        <span className="text-sm text-preto">
                            <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{discourse.length}</span> discourse relations validated
                        </span>
                        {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
                    </div>
                    {isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateAll('discourse', discourse.map(d => d.id))}
                            disabled={allValidated}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Validate All
                        </Button>
                    )}
                </div>
            )}

            {/* Discourse relations */}
            <div className="space-y-4">
                {discourse.map((d, idx) => {
                    const source = getEventDisplay(d.sourceId)
                    const target = getEventDisplay(d.targetId)

                    // Helper to render an event box
                    const EventBox = ({ event, side }: { event: typeof source, side: 'source' | 'target' }) => (
                        <div className={`flex-1 rounded-lg border-2 overflow-hidden ${side === 'source' ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                            {/* Header with ID and category */}
                            <div className={`px-3 py-2 flex items-center justify-between ${side === 'source' ? 'bg-amber-100/50' : 'bg-emerald-100/50'}`}>
                                <div className="flex items-center gap-2">
                                    <Zap className={`w-4 h-4 ${side === 'source' ? 'text-amber-600' : 'text-emerald-600'}`} />
                                    <span className="font-bold text-preto">{event.id}</span>
                                    <span className="text-lg font-semibold text-verde">{event.core}</span>
                                </div>
                                <Badge className={`text-[10px] uppercase ${CATEGORY_COLORS[event.category] || 'bg-gray-100 text-gray-700'}`}>
                                    {event.category}
                                </Badge>
                            </div>

                            {/* Clause text if available */}
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

                            {/* Roles */}
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

                            {/* Discourse/Narrative function badges */}
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

                    return (
                        <Card
                            key={d.id || `d-${d.sourceId}-${d.targetId}-${idx}`}
                            className={`group transition-all ${isValidated(d.id) ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}
                        >
                            <CardContent className="p-4">
                                {/* Validation checkbox */}
                                <div className="flex items-center gap-2 mb-3">
                                    <button
                                        onClick={() => toggleValidation('discourse', d.id)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${isValidated(d.id)
                                            ? 'bg-verde-claro/20 text-verde-claro'
                                            : 'bg-areia/30 text-areia hover:bg-areia/50'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isValidated(d.id)
                                            ? 'border-verde-claro bg-verde-claro'
                                            : 'border-areia'
                                            }`}>
                                            {isValidated(d.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-xs font-medium">
                                            {isValidated(d.id) ? 'Validated' : 'Click to validate'}
                                        </span>
                                    </button>
                                </div>

                                <div className="flex items-start gap-4">
                                    {/* Source event */}
                                    <EventBox event={source} side="source" />

                                    {/* Relation arrow */}
                                    <div className="flex flex-col items-center justify-center gap-2 py-4 min-w-[120px]">
                                        <Badge variant="success" className="text-xs uppercase font-bold px-3 py-1">
                                            {d.relationType}
                                        </Badge>
                                        <ArrowRight className="w-8 h-8 text-telha" />
                                        <span className="text-[10px] text-verde/60 text-center">
                                            {DISCOURSE_RELATIONS.find(r => r.value === d.relationType)?.label.split('(')[1]?.replace(')', '') || ''}
                                        </span>
                                    </div>

                                    {/* Target event */}
                                    <EventBox event={target} side="target" />

                                    {/* Edit button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 self-center"
                                        onClick={() => handleEdit(d)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>

                                    {/* Delete button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 text-red-500 self-center"
                                        onClick={() => handleDelete(d.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {discourse.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-verde/60">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No discourse relations yet. Add events in Stage 4 first, then define their relationships here.</p>
                    </CardContent>
                </Card>
            )}

            {events.length < 2 && (
                <div className="bg-azul/10 border border-azul/30 text-verde px-4 py-3 rounded-lg">
                    You need at least 2 events to create discourse relations. Please add events in Stage 4.
                </div>
            )}

            {/* Complete & Save Section */}
            <Card className="border-2 border-verde-claro/30 bg-verde-claro/5">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-preto flex items-center gap-2">
                                {saved ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-verde-claro" />
                                        Analysis Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 text-verde-claro" />
                                        Complete Your Analysis
                                    </>
                                )}
                            </h3>
                            <p className="text-sm text-verde mt-1">
                                {saved
                                    ? 'Your meaning map has been saved to the database. View it in "My Saved Maps".'
                                    : 'Save this analysis to the database. You can download it as JSON later from "My Saved Maps".'
                                }
                            </p>
                        </div>
                        <Button
                            onClick={handleFinalize}
                            disabled={saving || saved}
                            variant={saved ? 'outline' : 'default'}
                            className="gap-2"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saved ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? 'Saving...' : saved ? 'Saved' : 'Complete & Save'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Discourse Relation' : 'New Discourse Relation'}</DialogTitle>
                        <DialogDescription>Connect two events with a semantic relationship.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Source Event</label>
                            <Select value={formData.sourceId} onValueChange={(v) => setFormData({ ...formData, sourceId: v === '__clear__' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select event..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                    {[...events].sort((a, b) => {
                                        const getNum = (id: string) => {
                                            const match = id.match(/^e(\d+)$/);
                                            return match ? parseInt(match[1]) : Infinity;
                                        };
                                        const numA = getNum(a.eventId);
                                        const numB = getNum(b.eventId);
                                        if (numA !== Infinity && numB !== Infinity) return numA - numB;
                                        return a.eventId.localeCompare(b.eventId, undefined, { numeric: true });
                                    }).map((ev, idx) => (
                                        <SelectItem key={ev.id || `ev-${ev.eventId}-${idx}`} value={ev.id || ev.eventId}>
                                            {ev.eventId}: {ev.eventCore} ({ev.category})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Relation Type</label>
                            <Select value={formData.relationType} onValueChange={(v) => setFormData({ ...formData, relationType: v === '__clear__' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                    {DISCOURSE_RELATIONS.map(r => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Target Event</label>
                            <Select value={formData.targetId} onValueChange={(v) => setFormData({ ...formData, targetId: v === '__clear__' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select event..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                                    {[...events].sort((a, b) => {
                                        const getNum = (id: string) => {
                                            const match = id.match(/^e(\d+)$/);
                                            return match ? parseInt(match[1]) : Infinity;
                                        };
                                        const numA = getNum(a.eventId);
                                        const numB = getNum(b.eventId);
                                        if (numA !== Infinity && numB !== Infinity) return numA - numB;
                                        return a.eventId.localeCompare(b.eventId, undefined, { numeric: true });
                                    }).map((ev, idx) => (
                                        <SelectItem key={ev.id || `ev-${ev.eventId}-${idx}`} value={ev.id || ev.eventId}>
                                            {ev.eventId}: {ev.eventCore} ({ev.category})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Update Relation' : 'Create Relation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Stage5Discourse
