import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { RelationCreate } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { GitBranch, ArrowRight, Plus, Trash2, Loader2, Check, CheckCircle2 } from 'lucide-react'

const RELATION_CATEGORIES = ['kinship', 'social', 'possession', 'part_whole', 'origin', 'spatial', 'temporal', 'logical', 'comparison']

function Stage3Relations() {
    const {
        passageData,
        participants,
        relations,
        setRelations,
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
    const isValidated = (id: string) => validated.relations.has(id)
    const validatedCount = relations.filter(r => validated.relations.has(r.id)).length
    const allValidated = relations.length > 0 && relations.every(r => validated.relations.has(r.id))
    const [formData, setFormData] = useState<RelationCreate>({
        category: 'kinship',
        type: '',
        sourceId: '',
        targetId: ''
    })

    useEffect(() => {
        // Only fetch from DB if no relations in store (avoid overwriting AI-generated data)
        if (passageData?.id && relations.length === 0) {
            fetchRelations(passageData.id)
        }
    }, [passageData?.id])

    const fetchRelations = async (passageId: string) => {
        try {
            setLoading(true)
            const data = await bhsaAPI.getRelations(passageId)
            setRelations(data)
        } catch (err: any) {
            console.error('Failed to fetch relations:', err)
            setError(err.response?.data?.detail || 'Failed to fetch relations')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!passageData?.id) return

        try {
            setLoading(true)
            const created = await bhsaAPI.createRelation(passageData.id, formData)
            setRelations([...relations, created])

            // Track creation
            if (aiSnapshot) {
                trackEdit('create', 'relation', created.id, undefined, undefined, undefined, false)
            }

            setFormData({
                category: 'kinship',
                type: '',
                sourceId: '',
                targetId: ''
            })
        } catch (err: any) {
            console.error('Error creating relation:', err)
            setError(err.response?.data?.detail || 'Failed to create relation')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this relation?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteRelation(id)
            setRelations(relations.filter(r => r.id !== id))

            // Track deletion
            if (aiSnapshot) {
                const original = relations.find(r => r.id === id)
                // Relations are harder to match exactly, but we can check if ID existed in snapshot or assume AI if snapshot exists
                // Better heuristic: check if source+target+type matches something in AI snapshot
                let wasAiGenerated = false
                if (aiSnapshot.relations && original) {
                    wasAiGenerated = aiSnapshot.relations.some((r: any) =>
                        r.sourceId === original.sourceId &&
                        r.targetId === original.targetId &&
                        r.type === original.type
                    )
                }
                trackEdit('delete', 'relation', id, undefined, undefined, undefined, wasAiGenerated)
            }
        } catch (err: any) {
            console.error('Error deleting relation:', err)
            setError(err.response?.data?.detail || 'Failed to delete relation')
        } finally {
            setLoading(false)
        }
    }

    const getParticipantDisplay = (id: string, obj?: any) => {
        if (obj) return `${obj.participantId} (${obj.gloss})`
        const p = participants.find(p => p.id === id || p.participantId === id)
        return p ? `${p.participantId} (${p.gloss})` : 'Unknown'
    }

    if (!passageData) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-verde/60">
                    <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Please fetch a passage in Stage 1 first.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stage header */}
            <div>
                <h2 className="text-2xl font-bold text-preto flex items-center gap-2">
                    <GitBranch className="w-6 h-6 text-telha" />
                    Stage 3: Participant Relations
                </h2>
                <p className="text-verde mt-1">Define relationships between participants (Kinship, Social, etc.).</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Relations list */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-preto">Existing Relations</h3>

                    {relations.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-verde/60">
                                <p>No relations defined yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {/* Validation summary */}
                            <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                                    <span className="text-sm text-preto">
                                        <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{relations.length}</span> relations validated
                                    </span>
                                    {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
                                </div>
                                {isAdmin && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => validateAll('relations', relations.map(r => r.id))}
                                        disabled={allValidated}
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Validate All
                                    </Button>
                                )}
                            </div>

                            {relations.map(r => (
                                <Card
                                    key={r.id || `${r.sourceId}-${r.targetId}`}
                                    className={`group transition-all ${isValidated(r.id) ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            {/* Validation checkbox */}
                                            <button
                                                onClick={() => toggleValidation('relations', r.id)}
                                                className={`flex items-center gap-2 px-2 py-1 rounded transition-all mr-4 ${isValidated(r.id)
                                                    ? 'bg-verde-claro/20 text-verde-claro'
                                                    : 'bg-areia/30 text-areia hover:bg-areia/50'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isValidated(r.id)
                                                    ? 'border-verde-claro bg-verde-claro'
                                                    : 'border-areia'
                                                    }`}>
                                                    {isValidated(r.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="font-medium text-preto">
                                                    {getParticipantDisplay(r.sourceId, r.source)}
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Badge variant="success" className="text-xs">{r.category}</Badge>
                                                    <div className="flex items-center gap-1 text-telha font-semibold text-sm mt-1">
                                                        <ArrowRight className="w-4 h-4" />
                                                        {r.type}
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="font-medium text-preto">
                                                    {getParticipantDisplay(r.targetId, r.target)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                                                onClick={() => r.id && handleDelete(r.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add relation form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Plus className="w-5 h-5 text-telha" />
                            Add New Relation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Source Participant</label>
                                <Select value={formData.sourceId} onValueChange={(v) => setFormData({ ...formData, sourceId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Source..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {participants.map((p, idx) => (
                                            <SelectItem key={p.id || `p-${p.participantId}-${idx}`} value={p.id || p.participantId}>{p.participantId}: {p.gloss}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Target Participant</label>
                                <Select value={formData.targetId} onValueChange={(v) => setFormData({ ...formData, targetId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Target..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {participants.map((p, idx) => (
                                            <SelectItem key={p.id || `p-${p.participantId}-${idx}`} value={p.id || p.participantId}>{p.participantId}: {p.gloss}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Category</label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RELATION_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Relation Type</label>
                                <Input
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    placeholder="e.g. parent_of, master_of"
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Add Relation
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Stage3Relations
