import { useState, useEffect, useRef } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI, passagesAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { EventCreate, EventResponse, EventRoleBase, EventModifier, EventEmotion, KeyTerm } from '../../types'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Zap, Plus, Pencil, Trash2, Loader2, User, ChevronDown, ChevronRight, Check, CheckCircle2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import {
    EVENT_CATEGORIES,
    SEMANTIC_ROLES,
    MODIFIERS,
    SPEECH_ACTS,
    QUOTATION_TYPES,
    DISCOURSE_FUNCTIONS,
    NARRATIVE_FUNCTIONS,
    DISCOURSE_REGISTERS,
    SOCIAL_AXES,
    PROMINENCE_LEVELS,
    PACING_OPTIONS,
    EMOTIONS,
    EMOTION_INTENSITIES,
    EMOTION_SOURCES,
    CONFIDENCE_LEVELS,
    NARRATOR_STANCES,
    AUDIENCE_RESPONSES,
    FIGURE_TYPES,
    TRANSFERABILITY,
    SEMANTIC_DOMAINS,
    CONSISTENCY_OPTIONS
} from '../../constants/tripod'

// Section variant colors matching mm_poc
type SectionVariant = 'default' | 'roles' | 'modifiers' | 'pragmatic' | 'emotion' | 'la-tags' | 'figurative' | 'key-terms' | 'speech'

const sectionStyles: Record<SectionVariant, { header: string; content: string; border: string }> = {
    default: {
        header: 'bg-areia/10 hover:bg-areia/20',
        content: 'bg-white',
        border: 'border-areia/30'
    },
    roles: {
        header: 'bg-amber-50 hover:bg-amber-100',
        content: 'bg-amber-50/50',
        border: 'border-l-4 border-l-amber-400 border-areia/30'
    },
    modifiers: {
        header: 'bg-slate-50 hover:bg-slate-100',
        content: 'bg-white',
        border: 'border-areia/30'
    },
    pragmatic: {
        header: 'bg-yellow-50 hover:bg-yellow-100',
        content: 'bg-yellow-50/50',
        border: 'border-areia/30'
    },
    emotion: {
        header: 'bg-pink-50 hover:bg-pink-100',
        content: 'bg-pink-50/50',
        border: 'border-areia/30'
    },
    'la-tags': {
        header: 'bg-emerald-50 hover:bg-emerald-100',
        content: 'bg-emerald-50/50',
        border: 'border-areia/30'
    },
    figurative: {
        header: 'bg-purple-50 hover:bg-purple-100',
        content: 'bg-purple-50/50',
        border: 'border-areia/30'
    },
    'key-terms': {
        header: 'bg-orange-50 hover:bg-orange-100',
        content: 'bg-orange-50/50',
        border: 'border-areia/30'
    },
    speech: {
        header: 'bg-blue-50 hover:bg-blue-100',
        content: 'bg-blue-50/50',
        border: 'border-areia/30'
    }
}

// Collapsible section component with emoji and color support
function CollapsibleSection({
    title,
    emoji,
    icon: Icon,
    children,
    defaultOpen = false,
    count,
    variant = 'default',
    helpText
}: {
    title: string
    emoji?: string
    icon?: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    defaultOpen?: boolean
    count?: number
    variant?: SectionVariant
    helpText?: string
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const styles = sectionStyles[variant]

    return (
        <div className={`border rounded-lg overflow-hidden ${styles.border}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3 ${styles.header} transition-colors`}
            >
                <div className="flex items-center gap-2">
                    {emoji && <span className="text-lg">{emoji}</span>}
                    {Icon && !emoji && <Icon className="w-4 h-4 text-telha" />}
                    <span className="font-medium text-preto">{title}</span>
                    {count !== undefined && (
                        <span className="text-xs bg-verde/10 text-verde px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                    {helpText && (
                        <span className="text-xs text-verde/60 ml-2">{helpText}</span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-verde" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-verde" />
                )}
            </button>
            {isOpen && (
                <div className={`p-4 border-t border-areia/30 ${styles.content}`}>
                    {children}
                </div>
            )}
        </div>
    )
}

// Helper to render a select field
function SelectField({
    label,
    value,
    options,
    onChange,
    placeholder = "Select...",
    clearable = true
}: {
    label: string
    value?: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    placeholder?: string
    clearable?: boolean
}) {
    return (
        <div>
            <label className="text-sm font-medium text-preto mb-1.5 block">{label}</label>
            <Select value={value || ''} onValueChange={(v) => onChange(v === '__clear__' ? '' : v)}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {clearable && (
                        <SelectItem value="__clear__" className="text-gray-400 italic">N/A</SelectItem>
                    )}
                    {options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}


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
        aiSnapshot,
        validated,
        toggleValidation,
        validateAll
    } = usePassageStore()

    const { isAdmin } = useAuth()

    // Validation helpers
    const isValidated = (id: string) => validated.events.has(id)
    const validatedCount = events.filter(e => validated.events.has(e.id)).length
    const allValidated = events.length > 0 && events.every(e => validated.events.has(e.id))

    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    // DB clauses with UUIDs - needed to match event.clauseId to actual clause data
    const [dbClauses, setDbClauses] = useState<any[]>([])
    const [formData, setFormData] = useState<EventCreate>({
        eventId: '',
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
    // Track original data to compute delta for partial updates
    const [originalData, setOriginalData] = useState<EventCreate | null>(null)
    
    // Track which passage we've already fetched to prevent duplicate fetches
    const fetchedPassageRef = useRef<string | null>(null)

    useEffect(() => {
        if (passageData?.id && passageData.id !== fetchedPassageRef.current) {
            // Only fetch if we haven't fetched for this passage yet
            fetchedPassageRef.current = passageData.id
            // Fetch DB clauses to get UUID mappings
            fetchDbClauses(passageData.id)
            // Always fetch events from DB to ensure we have complete data with all sub-models
            // The store might have stale data from AI analysis that doesn't include modifiers/pragmatic
            fetchEvents(passageData.id)
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
        setEditingId(null)
    }

    const handleCreate = () => {
        resetForm()
        setShowModal(true)
    }

    const handleEdit = (ev: EventResponse) => {
        const eventData = {
            eventId: ev.eventId,
            clauseId: ev.clauseId,
            category: ev.category,
            eventCore: ev.eventCore,
            discourseFunction: ev.discourseFunction,
            chainPosition: ev.chainPosition,
            narrativeFunction: ev.narrativeFunction,
            roles: ev.roles || [],
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
        // Store original data for delta comparison
        setOriginalData(JSON.parse(JSON.stringify(eventData)))
        setEditingId(ev.id)
        setShowModal(true)
    }

    // Compute delta between original and current form data
    const computeDelta = (original: EventCreate | null, current: EventCreate): Partial<EventCreate> => {
        if (!original) return current

        const delta: Partial<EventCreate> = {}

        // Check scalar fields
        if (current.category !== original.category) delta.category = current.category
        if (current.eventCore !== original.eventCore) delta.eventCore = current.eventCore
        if (current.discourseFunction !== original.discourseFunction) delta.discourseFunction = current.discourseFunction
        if (current.chainPosition !== original.chainPosition) delta.chainPosition = current.chainPosition
        if (current.narrativeFunction !== original.narrativeFunction) delta.narrativeFunction = current.narrativeFunction
        // Note: clauseId is intentionally excluded from delta - changing clause requires full update

        // Check complex objects (using JSON comparison for simplicity)
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
        if (loading) return // Prevent duplicate submits

        try {
            setLoading(true)
            if (editingId) {
                // Compute delta and use PATCH for partial updates
                const delta = computeDelta(originalData, formData)
                const hasChanges = Object.keys(delta).length > 0

                let updated
                if (hasChanges) {
                    console.log('Patching event:', editingId, delta)
                    updated = await bhsaAPI.patchEvent(editingId, delta)
                    console.log('Event patched successfully:', updated)
                } else {
                    // No changes, just close modal
                    setShowModal(false)
                    return
                }
                // Update the events in the store
                setEvents(events.map(ev => ev.id === editingId ? updated : ev))

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
                console.log('Creating event:', formData)
                const created = await bhsaAPI.createEvent(passageData.id, formData)
                console.log('Event created successfully:', created)
                setEvents([...events, created])

                if (aiSnapshot) {
                    trackEdit('create', 'event', created.id, undefined, undefined, undefined, false)
                }
            }
            setShowModal(false)
            setOriginalData(null)
        } catch (err: any) {
            console.error('Error saving event:', err)
            console.error('Error details:', err.response?.data || err.message)
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
            setEvents(events.filter(ev => ev.id !== id))

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

    // Role management
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

    // Modifier update helper
    const updateModifier = (key: keyof EventModifier, value: string) => {
        setFormData({
            ...formData,
            modifiers: { ...formData.modifiers, [key]: value }
        })
    }

    // Emotion management
    const addEmotion = () => {
        setFormData({
            ...formData,
            emotions: [...(formData.emotions || []), {
                primary: 'joy',
                intensity: 'medium',
                source: 'contextual',
                confidence: 'medium'
            }]
        })
    }

    const updateEmotion = (index: number, field: keyof EventEmotion, value: string) => {
        const newEmotions = [...(formData.emotions || [])]
        newEmotions[index] = { ...newEmotions[index], [field]: value }
        setFormData({ ...formData, emotions: newEmotions })
    }

    const removeEmotion = (index: number) => {
        const newEmotions = (formData.emotions || []).filter((_, i) => i !== index)
        setFormData({ ...formData, emotions: newEmotions })
    }

    // Key term management
    const addKeyTerm = () => {
        setFormData({
            ...formData,
            keyTerms: [...(formData.keyTerms || []), {
                termId: `kt${(formData.keyTerms?.length || 0) + 1}`,
                sourceLemma: '',
                semanticDomain: 'theological',
                consistency: 'preferred'
            }]
        })
    }

    const updateKeyTerm = (index: number, field: keyof KeyTerm, value: string) => {
        const newTerms = [...(formData.keyTerms || [])]
        newTerms[index] = { ...newTerms[index], [field]: value }
        setFormData({ ...formData, keyTerms: newTerms })
    }

    const removeKeyTerm = (index: number) => {
        const newTerms = (formData.keyTerms || []).filter((_, i) => i !== index)
        setFormData({ ...formData, keyTerms: newTerms })
    }

    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            ACTION: 'bg-telha/10 text-telha border-telha/20',
            SPEECH: 'bg-azul/20 text-verde border-azul/30',
            MOTION: 'bg-verde-claro/20 text-verde border-verde-claro/30',
            STATE: 'bg-areia/30 text-verde border-areia',
            PROCESS: 'bg-purple-100 text-purple-800 border-purple-200',
            TRANSFER: 'bg-blue-100 text-blue-800 border-blue-200',
            INTERNAL: 'bg-pink-100 text-pink-800 border-pink-200',
            RITUAL: 'bg-amber-100 text-amber-800 border-amber-200',
            META: 'bg-gray-100 text-gray-800 border-gray-200'
        }
        return colors[cat] || 'bg-gray-100 text-gray-800 border-gray-200'
    }

    // Helper to check field presence for indicators
    const getFieldIndicators = (ev: EventResponse) => {
        const validRoles = (ev.roles || []).filter(r => {
            const p = participants.find(p => p.participantId === r.participantId || p.id === r.participantId)
            return p && p.gloss && p.gloss.trim() !== ''
        })

        const hasModifiers = ev.modifiers && Object.values(ev.modifiers).some(v => v !== null && v !== undefined && v !== '')
        const hasSpeechAct = ev.speechAct && (ev.speechAct.type || ev.speechAct.quotationType)
        const hasPragmatic = ev.pragmatic && Object.values(ev.pragmatic).some(v => v !== null && v !== undefined && v !== '')
        const hasNarratorStance = ev.narratorStance && ev.narratorStance.stance
        const hasAudienceResponse = ev.audienceResponse && ev.audienceResponse.response
        const hasFigurative = ev.figurative && ev.figurative.isFigurative
        const hasLaTags = ev.laRetrieval && (
            (ev.laRetrieval.emotionTags?.length || 0) > 0 ||
            (ev.laRetrieval.eventTags?.length || 0) > 0 ||
            (ev.laRetrieval.registerTags?.length || 0) > 0 ||
            (ev.laRetrieval.discourseTags?.length || 0) > 0 ||
            (ev.laRetrieval.socialTags?.length || 0) > 0
        )
        const emotionsCount = (ev.emotions || []).length
        const keyTermsCount = (ev.keyTerms || []).length

        return {
            roles: validRoles.length,
            modifiers: hasModifiers,
            speechAct: hasSpeechAct,
            pragmatic: hasPragmatic,
            narratorStance: hasNarratorStance,
            audienceResponse: hasAudienceResponse,
            figurative: hasFigurative,
            laTags: hasLaTags,
            emotions: emotionsCount,
            keyTerms: keyTermsCount
        }
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

            {/* Validation summary */}
            {events.length > 0 && (
                <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                        <span className="text-sm text-preto">
                            <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{events.length}</span> events validated
                        </span>
                        {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
                    </div>
                    {isAdmin && (
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

            {/* Events list */}
            <div className="space-y-4">
                {[...events]
                    .sort((a, b) => {
                        // Natural sort by number in e<number>
                        const numA = parseInt(a.eventId.replace(/^e/, ''), 10) || 0;
                        const numB = parseInt(b.eventId.replace(/^e/, ''), 10) || 0;
                        return numA - numB;
                    })
                    .map((ev, idx) => (
                        <Card
                            key={ev.id || `ev-${ev.eventId}-${idx}`}
                            className={`group transition-all ${isValidated(ev.id) ? 'border-verde-claro/50 bg-verde-claro/5' : ''}`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Validation checkbox */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <button
                                                onClick={() => toggleValidation('events', ev.id)}
                                                className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${isValidated(ev.id)
                                                    ? 'bg-verde-claro/20 text-verde-claro'
                                                    : 'bg-areia/30 text-areia hover:bg-areia/50'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isValidated(ev.id)
                                                    ? 'border-verde-claro bg-verde-claro'
                                                    : 'border-areia'
                                                    }`}>
                                                    {isValidated(ev.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs font-medium">
                                                    {isValidated(ev.id) ? '✓' : ''}
                                                </span>
                                            </button>
                                            <span className="text-lg font-semibold text-telha">{ev.eventId}</span>
                                            <span className="text-lg font-medium text-preto">{ev.eventCore}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(ev.category)}`}>
                                                {ev.category}
                                            </span>
                                            {ev.discourseFunction && (
                                                <span className="text-xs text-verde bg-verde/10 px-2 py-0.5 rounded">
                                                    {ev.discourseFunction}
                                                </span>
                                            )}
                                            {ev.narrativeFunction && (
                                                <span className="text-xs text-azul bg-azul/10 px-2 py-0.5 rounded">
                                                    {ev.narrativeFunction}
                                                </span>
                                            )}
                                        </div>

                                        {(() => {
                                            // ev.clauseId is the 1-based logical index (e.g. "1", "2") from backend
                                            // Match against clauseIndex+1 to find the correct DB clause
                                            const clauseIndex = ev.clauseId ? parseInt(ev.clauseId, 10) - 1 : -1
                                            const dbClause = dbClauses.find(c => c.clauseIndex === clauseIndex)
                                            // Also try matching with BHSA clause via clause_id for display
                                            const bhsaClause = dbClause
                                                ? passageData?.clauses?.find(c => c.clause_id === dbClause.clauseIndex)
                                                : null

                                            if (!ev.clauseId) {
                                                return (
                                                    <div className="mt-2 mb-3 pl-3 border-l-2 border-amarelo/20">
                                                        <p className="text-xs text-amarelo/70 italic">(No segment linked)</p>
                                                    </div>
                                                )
                                            }

                                            // Use DB clause freeTranslation, or BHSA clause data
                                            const translation = dbClause?.freeTranslation || bhsaClause?.freeTranslation
                                            const clauseText = dbClause?.text || bhsaClause?.text
                                            const clauseGloss = dbClause?.gloss || bhsaClause?.gloss

                                            return (
                                                <div className="mt-2 mb-3 pl-3 border-l-2 border-telha/20">
                                                    {clauseText && (
                                                        <p className="text-right text-lg font-serif text-preto mb-1" dir="rtl">{clauseText}</p>
                                                    )}
                                                    {clauseGloss && (
                                                        <p className="text-sm text-verde italic mb-1">{clauseGloss}</p>
                                                    )}
                                                    {translation && (
                                                        <p className="text-sm text-telha italic">"{translation}"</p>
                                                    )}
                                                    {!clauseText && !translation && (
                                                        <p className="text-xs text-cinza/50 italic">(No clause data available)</p>
                                                    )}
                                                </div>
                                            )
                                        })()}

                                        {ev.roles && ev.roles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {ev.roles
                                                    .filter(r => {
                                                        // Only show roles with valid participant data
                                                        const p = participants.find(p => p.participantId === r.participantId || p.id === r.participantId)
                                                        const displayValue = p ? p.gloss : r.participantId
                                                        return displayValue && displayValue.trim() !== ''
                                                    })
                                                    .map((r, i) => {
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

                                        {/* Field presence indicators */}
                                        {(() => {
                                            const indicators = getFieldIndicators(ev)
                                            return (
                                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-areia/20">
                                                    {/* Roles */}
                                                    {indicators.roles > 0 && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                                            👥 {indicators.roles} Roles
                                                        </span>
                                                    )}

                                                    {/* Modifiers */}
                                                    {indicators.modifiers && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                                                            ⚙️ Modifiers
                                                        </span>
                                                    )}

                                                    {/* Speech Act */}
                                                    {indicators.speechAct && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                            💬 {QUOTATION_TYPES.find(o => o.value === ev.speechAct?.quotationType)?.label || ev.speechAct?.quotationType || 'Speech'}
                                                        </span>
                                                    )}

                                                    {/* Pragmatic */}
                                                    {indicators.pragmatic && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
                                                            🗣️ Pragmatic
                                                        </span>
                                                    )}

                                                    {/* Emotions */}
                                                    {indicators.emotions > 0 && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-pink-50 text-pink-700 border border-pink-200 font-medium">
                                                            💜 {indicators.emotions} Emotions
                                                        </span>
                                                    )}

                                                    {/* Narrator/Audience */}
                                                    {(indicators.narratorStance || indicators.audienceResponse) && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                                                            🎭 Viewpoint
                                                        </span>
                                                    )}

                                                    {/* Figurative */}
                                                    {indicators.figurative && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                                            🎨 Figurative
                                                        </span>
                                                    )}

                                                    {/* Key Terms */}
                                                    {indicators.keyTerms > 0 && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                                                            🔑 {indicators.keyTerms} Key Terms
                                                        </span>
                                                    )}

                                                    {/* LA Tags */}
                                                    {indicators.laTags && (
                                                        <span className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                                            📦 LA Tags
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })()}
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle>
                        <DialogDescription>Define an event with its category, roles, modifiers, and more.</DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                            <p className="text-sm font-medium">Error: {error}</p>
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Event ID</label>
                                <Input
                                    value={formData.eventId}
                                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                    placeholder="e1, e2..."
                                />
                            </div>
                            <SelectField
                                label="Category"
                                value={formData.category}
                                options={EVENT_CATEGORIES}
                                onChange={(v) => setFormData({ ...formData, category: v })}
                            />
                        </div>

                        {/* Clause Selection - use DB clauses with UUID values */}
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Associated Segment (Clause)</label>
                            <Select
                                value={formData.clauseId || "unassigned"}
                                onValueChange={(v) => setFormData({ ...formData, clauseId: v === "unassigned" ? undefined : v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a clause..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                    {dbClauses.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.clauseIndex}: {c.text}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Event Core (Concept)</label>
                            <Input
                                value={formData.eventCore}
                                onChange={(e) => setFormData({ ...formData, eventCore: e.target.value })}
                                placeholder="e.g. go, say, create"
                            />
                        </div>

                        {/* Quick Access Fields - Viewpoint, Causation, Discourse/Narrative Functions */}
                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Viewpoint (Aspect)"
                                value={formData.modifiers?.viewpoint}
                                options={MODIFIERS.viewpoint.options}
                                onChange={(v) => updateModifier('viewpoint', v)}
                            />
                            <SelectField
                                label="Causation"
                                value={formData.modifiers?.causation}
                                options={MODIFIERS.causation.options}
                                onChange={(v) => updateModifier('causation', v)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Narrative Function"
                                value={formData.narrativeFunction}
                                options={NARRATIVE_FUNCTIONS}
                                onChange={(v) => setFormData({ ...formData, narrativeFunction: v })}
                            />
                            <SelectField
                                label="Discourse Function"
                                value={formData.discourseFunction}
                                options={DISCOURSE_FUNCTIONS}
                                onChange={(v) => setFormData({ ...formData, discourseFunction: v })}
                            />
                        </div>

                        {/* Collapsible Sections */}
                        <div className="space-y-3 pt-4">
                            {/* Roles */}
                            <CollapsibleSection title="Roles" emoji="👥" count={formData.roles.length} defaultOpen={true} variant="roles">
                                <div className="space-y-2">
                                    {formData.roles.map((role, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <Select value={role.role} onValueChange={(v) => updateRole(i, 'role', v)}>
                                                <SelectTrigger className="w-40">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SEMANTIC_ROLES.map(r => (
                                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={role.participantId || ''} onValueChange={(v) => updateRole(i, 'participantId', v)}>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select participant..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {participants.map((p, idx) => (
                                                        <SelectItem key={p.id || `p-${p.participantId}-${idx}`} value={p.id}>
                                                            {p.participantId}: {p.gloss}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeRole(i)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addRole}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Role
                                    </Button>
                                </div>
                            </CollapsibleSection>

                            {/* Modifiers */}
                            <CollapsibleSection
                                title="Modifiers"
                                emoji="⚙️"
                                variant="modifiers"
                                defaultOpen={Object.values(formData.modifiers || {}).some(v => !!v)}
                            >
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.entries(MODIFIERS).map(([key, mod]) => (
                                        <SelectField
                                            key={key}
                                            label={mod.label}
                                            value={formData.modifiers?.[key as keyof EventModifier]}
                                            options={mod.options}
                                            onChange={(v) => updateModifier(key as keyof EventModifier, v)}
                                        />
                                    ))}
                                </div>
                            </CollapsibleSection>

                            {/* Speech Act (for SPEECH category or if data exists) */}
                            {(formData.category === 'SPEECH' || formData.category === 'COMMUNICATION' || formData.speechAct?.type || formData.speechAct?.quotationType) && (
                                <CollapsibleSection
                                    title="Speech Act"
                                    emoji="💬"
                                    variant="speech"
                                    defaultOpen={true}
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <SelectField
                                            label="Speech Act Type"
                                            value={formData.speechAct?.type}
                                            options={SPEECH_ACTS}
                                            onChange={(v) => setFormData({
                                                ...formData,
                                                speechAct: { ...formData.speechAct, type: v }
                                            })}
                                        />
                                        <SelectField
                                            label="Quotation Type"
                                            value={formData.speechAct?.quotationType}
                                            options={QUOTATION_TYPES}
                                            onChange={(v) => setFormData({
                                                ...formData,
                                                speechAct: { ...formData.speechAct, quotationType: v }
                                            })}
                                        />
                                    </div>
                                </CollapsibleSection>
                            )}

                            {/* Pragmatic */}
                            <CollapsibleSection title="Pragmatic" emoji="🗣️" variant="pragmatic">
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        label="Register"
                                        value={formData.pragmatic?.register}
                                        options={DISCOURSE_REGISTERS}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            pragmatic: { ...formData.pragmatic, register: v }
                                        })}
                                    />
                                    <SelectField
                                        label="Social Axis"
                                        value={formData.pragmatic?.socialAxis}
                                        options={SOCIAL_AXES}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            pragmatic: { ...formData.pragmatic, socialAxis: v }
                                        })}
                                    />
                                    <SelectField
                                        label="Prominence"
                                        value={formData.pragmatic?.prominence}
                                        options={PROMINENCE_LEVELS}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            pragmatic: { ...formData.pragmatic, prominence: v }
                                        })}
                                    />
                                    <SelectField
                                        label="Pacing"
                                        value={formData.pragmatic?.pacing}
                                        options={PACING_OPTIONS}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            pragmatic: { ...formData.pragmatic, pacing: v }
                                        })}
                                    />
                                </div>
                            </CollapsibleSection>

                            {/* Emotions */}
                            <CollapsibleSection title="Emotion" emoji="💜" count={formData.emotions?.length} variant="emotion">
                                <div className="space-y-3">
                                    {(formData.emotions || []).map((emo, i) => (
                                        <div key={i} className="p-3 bg-areia/10 rounded-lg space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Emotion {i + 1}</span>
                                                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeEmotion(i)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <SelectField
                                                    label="Primary Emotion"
                                                    value={emo.primary}
                                                    options={EMOTIONS}
                                                    onChange={(v) => updateEmotion(i, 'primary', v)}
                                                />
                                                <SelectField
                                                    label="Secondary Emotion"
                                                    value={emo.secondary}
                                                    options={EMOTIONS}
                                                    onChange={(v) => updateEmotion(i, 'secondary', v)}
                                                />
                                                <SelectField
                                                    label="Intensity"
                                                    value={emo.intensity}
                                                    options={EMOTION_INTENSITIES}
                                                    onChange={(v) => updateEmotion(i, 'intensity', v)}
                                                />
                                                <SelectField
                                                    label="Source"
                                                    value={emo.source}
                                                    options={EMOTION_SOURCES}
                                                    onChange={(v) => updateEmotion(i, 'source', v)}
                                                />
                                                <SelectField
                                                    label="Confidence"
                                                    value={emo.confidence}
                                                    options={CONFIDENCE_LEVELS}
                                                    onChange={(v) => updateEmotion(i, 'confidence', v)}
                                                />
                                                <Select value={emo.participantId || ''} onValueChange={(v) => updateEmotion(i, 'participantId', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Who feels it?" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {participants.map(p => (
                                                            <SelectItem key={p.id} value={p.participantId}>
                                                                {p.participantId}: {p.gloss}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Textarea
                                                placeholder="Notes..."
                                                value={emo.notes || ''}
                                                onChange={(e) => updateEmotion(i, 'notes', e.target.value)}
                                                className="mt-2"
                                            />
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addEmotion}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Emotion
                                    </Button>
                                </div>
                            </CollapsibleSection>

                            {/* Narrator Stance & Audience Response */}
                            <CollapsibleSection title="Narrator & Audience" emoji="📖" variant="emotion">
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        label="Narrator Stance"
                                        value={formData.narratorStance?.stance}
                                        options={NARRATOR_STANCES}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            narratorStance: { stance: v }
                                        })}
                                    />
                                    <SelectField
                                        label="Intended Audience Response"
                                        value={formData.audienceResponse?.response}
                                        options={AUDIENCE_RESPONSES}
                                        onChange={(v) => setFormData({
                                            ...formData,
                                            audienceResponse: { response: v }
                                        })}
                                    />
                                </div>
                            </CollapsibleSection>

                            {/* Figurative Language */}
                            <CollapsibleSection title="Figurative" emoji="🎭" variant="figurative">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.figurative?.isFigurative || false}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                figurative: { ...formData.figurative, isFigurative: e.target.checked }
                                            })}
                                            className="rounded border-areia"
                                        />
                                        <label className="text-sm">Contains figurative language</label>
                                    </div>

                                    {formData.figurative?.isFigurative && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField
                                                label="Figure Type"
                                                value={formData.figurative?.figureType}
                                                options={FIGURE_TYPES}
                                                onChange={(v) => setFormData({
                                                    ...formData,
                                                    figurative: { ...formData.figurative, figureType: v }
                                                })}
                                            />
                                            <SelectField
                                                label="Transferability"
                                                value={formData.figurative?.transferability}
                                                options={TRANSFERABILITY}
                                                onChange={(v) => setFormData({
                                                    ...formData,
                                                    figurative: { ...formData.figurative, transferability: v }
                                                })}
                                            />
                                            <div>
                                                <label className="text-sm font-medium text-preto mb-1.5 block">Source Domain</label>
                                                <Input
                                                    value={formData.figurative?.sourceDomain || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        figurative: { ...formData.figurative, sourceDomain: e.target.value }
                                                    })}
                                                    placeholder="e.g., shepherd"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-preto mb-1.5 block">Target Domain</label>
                                                <Input
                                                    value={formData.figurative?.targetDomain || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        figurative: { ...formData.figurative, targetDomain: e.target.value }
                                                    })}
                                                    placeholder="e.g., God"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-preto mb-1.5 block">Literal Meaning</label>
                                                <Textarea
                                                    value={formData.figurative?.literalMeaning || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        figurative: { ...formData.figurative, literalMeaning: e.target.value }
                                                    })}
                                                    placeholder="What does it literally say?"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-preto mb-1.5 block">Intended Meaning</label>
                                                <Textarea
                                                    value={formData.figurative?.intendedMeaning || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        figurative: { ...formData.figurative, intendedMeaning: e.target.value }
                                                    })}
                                                    placeholder="What does it actually mean?"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-preto mb-1.5 block">Translation Note</label>
                                                <Textarea
                                                    value={formData.figurative?.translationNote || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        figurative: { ...formData.figurative, translationNote: e.target.value }
                                                    })}
                                                    placeholder="Notes for translators..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* Key Terms */}
                            <CollapsibleSection title="Key Terms" emoji="🔑" count={formData.keyTerms?.length} variant="key-terms">
                                <div className="space-y-3">
                                    {(formData.keyTerms || []).map((term, i) => (
                                        <div key={i} className="p-3 bg-areia/10 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">Term {i + 1}</span>
                                                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeKeyTerm(i)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-sm font-medium text-preto mb-1.5 block">Source Lemma</label>
                                                    <Input
                                                        value={term.sourceLemma}
                                                        onChange={(e) => updateKeyTerm(i, 'sourceLemma', e.target.value)}
                                                        placeholder="Hebrew/Greek lemma"
                                                    />
                                                </div>
                                                <SelectField
                                                    label="Semantic Domain"
                                                    value={term.semanticDomain}
                                                    options={SEMANTIC_DOMAINS}
                                                    onChange={(v) => updateKeyTerm(i, 'semanticDomain', v)}
                                                />
                                                <SelectField
                                                    label="Consistency"
                                                    value={term.consistency}
                                                    options={CONSISTENCY_OPTIONS}
                                                    onChange={(v) => updateKeyTerm(i, 'consistency', v)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addKeyTerm}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Key Term
                                    </Button>
                                </div>
                            </CollapsibleSection>

                            {/* LA Tags */}
                            <CollapsibleSection title="LA Tags" emoji="🏷️" variant="la-tags">
                                <p className="text-sm text-verde/70 mb-3">
                                    Tags for Language Assistant retrieval (comma-separated).
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-preto mb-1.5 block">Emotion Tags</label>
                                        <Input
                                            value={(formData.laRetrieval?.emotionTags || []).join(', ')}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                laRetrieval: {
                                                    ...formData.laRetrieval,
                                                    emotionTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            })}
                                            placeholder="joy, hope, fear"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-preto mb-1.5 block">Event Tags</label>
                                        <Input
                                            value={(formData.laRetrieval?.eventTags || []).join(', ')}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                laRetrieval: {
                                                    ...formData.laRetrieval,
                                                    eventTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            })}
                                            placeholder="creation, promise, judgment"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-preto mb-1.5 block">Register Tags</label>
                                        <Input
                                            value={(formData.laRetrieval?.registerTags || []).join(', ')}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                laRetrieval: {
                                                    ...formData.laRetrieval,
                                                    registerTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            })}
                                            placeholder="formal, poetic"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-preto mb-1.5 block">Discourse Tags</label>
                                        <Input
                                            value={(formData.laRetrieval?.discourseTags || []).join(', ')}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                laRetrieval: {
                                                    ...formData.laRetrieval,
                                                    discourseTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            })}
                                            placeholder="peak, background"
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="button" onClick={handleSubmit} disabled={loading}>
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
