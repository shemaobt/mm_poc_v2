import { useState, useEffect } from 'react'
import { usePassageStore } from '../../../stores/passageStore'
import { bhsaAPI, mapsAPI, passagesAPI } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { toast } from 'sonner'
import { DiscourseRelationCreate, DiscourseRelationResponse } from '../../../types'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { MessageSquare, Plus } from 'lucide-react'
import { DiscourseRelationCard } from './DiscourseRelationCard'
import { ValidationHeader } from './ValidationHeader'
import { DiscourseRelationDialog } from './DiscourseRelationDialog'
import { FinalizeCard } from './FinalizeCard'
import { buildEventDisplay } from './utils'
import { emptyStateStyles, stageHeaderStyles, errorStateStyles, cardStyles, infoStateStyles } from '@/styles'

function Stage5Discourse() {
    const {
        passageData,
        discourse,
        setDiscourse,
        events,
        readOnly,
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

    const isValidated = (id: string) => validated.discourse.has(id)
    const validatedCount = discourse.filter(d => validated.discourse.has(d.id)).length
    const allValidated = discourse.length > 0 && discourse.every(d => validated.discourse.has(d.id))

    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [dbClauses, setDbClauses] = useState<any[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<DiscourseRelationCreate>({
        relationType: 'sequence',
        sourceId: '',
        targetId: ''
    })

    useEffect(() => {
        if (passageData?.id) {
            fetchDbClauses(passageData.id)
            fetchDiscourse(passageData.id)
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
        if (readOnly) return
        setFormData({
            relationType: 'sequence',
            sourceId: events[0]?.id || '',
            targetId: events[1]?.id || ''
        })
        setEditingId(null)
        setShowModal(true)
    }

    const handleEdit = (d: DiscourseRelationResponse) => {
        if (readOnly) return
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
                const idToUpdate = editingId
                setDiscourse((prev: DiscourseRelationResponse[]): DiscourseRelationResponse[] => {
                    const prevItem = prev.find((d) => d.id === idToUpdate)
                    const merged: DiscourseRelationResponse = prevItem ? { ...prevItem, ...updated } : updated
                    return prev.map((d) => (d.id === idToUpdate ? merged : d))
                })

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
                setDiscourse((prev: DiscourseRelationResponse[]): DiscourseRelationResponse[] => [...prev, created])

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
            setDiscourse((prev: DiscourseRelationResponse[]): DiscourseRelationResponse[] => prev.filter((d) => d.id !== id))

            if (aiSnapshot) {
                const original = discourse.find(d => d.id === id)
                let wasAiGenerated = false
                if (aiSnapshot.discourse && original) {
                    wasAiGenerated = aiSnapshot.discourse.some((d: any) =>
                        d.relationType === original.relationType &&
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

    const getEventDisplay = (eventId: string) =>
        buildEventDisplay(eventId, events, dbClauses, passageData, participants)

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
            <Card className={cardStyles.dashed}>
                <CardContent className={emptyStateStyles.container}>
                    <MessageSquare className={emptyStateStyles.icon} />
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
                        <MessageSquare className={stageHeaderStyles.icon} />
                        Stage 5: Discourse
                    </h2>
                    <p className={stageHeaderStyles.description}>Define high-level structure and relationships between events.</p>
                </div>
                {!readOnly && (
                    <Button onClick={handleCreate} disabled={events.length < 2} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Relation
                    </Button>
                )}
            </div>

            {error && (
                <div className={errorStateStyles.banner}>
                    {error}
                </div>
            )}

            {discourse.length > 0 && (
                <ValidationHeader
                    validatedCount={validatedCount}
                    totalCount={discourse.length}
                    allValidated={allValidated}
                    readOnly={readOnly}
                    isAdmin={isAdmin}
                    onValidateAll={() => validateAll('discourse', discourse.map(d => d.id))}
                />
            )}

            <div className="space-y-4">
                {discourse.map((d, idx) => {
                    const source = getEventDisplay(d.sourceId)
                    const target = getEventDisplay(d.targetId)

                    return (
                        <DiscourseRelationCard
                            key={d.id || `d-${d.sourceId}-${d.targetId}-${idx}`}
                            relation={d}
                            source={source}
                            target={target}
                            isValidated={isValidated(d.id)}
                            readOnly={readOnly}
                            onToggleValidation={() => toggleValidation('discourse', d.id)}
                            onEdit={() => handleEdit(d)}
                            onDelete={() => handleDelete(d.id)}
                        />
                    )
                })}
            </div>

            {discourse.length === 0 && (
                <Card className={cardStyles.dashed}>
                    <CardContent className={emptyStateStyles.container}>
                        <MessageSquare className={emptyStateStyles.icon} />
                        <p>No discourse relations yet. Add events in Stage 4 first, then define their relationships here.</p>
                    </CardContent>
                </Card>
            )}

            {events.length < 2 && (
                <div className={infoStateStyles.banner}>
                    You need at least 2 events to create discourse relations. Please add events in Stage 4.
                </div>
            )}

            <FinalizeCard
                saving={saving}
                saved={saved}
                onFinalize={handleFinalize}
            />

            <DiscourseRelationDialog
                open={showModal}
                onOpenChange={setShowModal}
                formData={formData}
                onFormChange={setFormData}
                events={events}
                loading={loading}
                isEditing={!!editingId}
                onSubmit={handleSubmit}
            />
        </div>
    )
}

export default Stage5Discourse
