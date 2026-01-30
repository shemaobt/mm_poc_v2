import { useState, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import { usePassageStore } from '../../../stores/passageStore'
import { bhsaAPI } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { RelationResponse } from '../../../types'
import { NoPassageState, NoRelationsState } from './EmptyState'
import { ValidationHeader } from './ValidationHeader'
import { RelationCard } from './RelationCard'
import { RelationForm } from './RelationForm'
import { RelationFormData } from './types'
import { stageHeaderStyles, errorStateStyles } from '@/styles'

const INITIAL_FORM_DATA: RelationFormData = {
    category: 'kinship',
    type: '',
    sourceId: '',
    targetId: ''
}

function Stage3Relations() {
    const {
        passageData,
        participants,
        readOnly,
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

    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<RelationFormData>(INITIAL_FORM_DATA)

    const validatedCount = relations.filter(r => validated.relations.has(r.id)).length
    const allValidated = relations.length > 0 && relations.every(r => validated.relations.has(r.id))

    useEffect(() => {
        if (passageData?.id) {
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

    const resetForm = () => {
        setFormData(INITIAL_FORM_DATA)
        setEditingId(null)
    }

    const handleEdit = (rel: RelationResponse) => {
        if (readOnly) return
        setFormData({
            category: rel.category,
            type: rel.type,
            sourceId: rel.sourceId,
            targetId: rel.targetId
        })
        setEditingId(rel.id)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!passageData?.id) return

        if (!formData.sourceId || !formData.targetId) {
            setError('Please select both source and target participants.')
            return
        }
        setError(null)

        try {
            setLoading(true)
            if (editingId) {
                const updated = await bhsaAPI.updateRelation(editingId, formData)
                const idToUpdate = editingId
                setRelations((prev: RelationResponse[]) => {
                    const prevItem = prev.find((r: RelationResponse) => r.id === idToUpdate)
                    const merged = prevItem ? { ...prevItem, ...updated } : updated
                    return prev.map((r: RelationResponse) => (r.id === idToUpdate ? merged : r))
                })

                if (aiSnapshot) {
                    const original = relations.find(r => r.id === editingId)
                    const fields = ['category', 'type', 'sourceId', 'targetId'] as const
                    fields.forEach(field => {
                        if (original && original[field] !== formData[field]) {
                            const wasAiGenerated = aiSnapshot.relations?.some((r: any) => r.type === original.type)
                            trackEdit('update', 'relation', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                }
            } else {
                const created = await bhsaAPI.createRelation(passageData.id, formData)
                setRelations((prev: RelationResponse[]) => [...prev, created])

                if (aiSnapshot) {
                    trackEdit('create', 'relation', created.id, undefined, undefined, undefined, false)
                }
            }

            resetForm()
        } catch (err: any) {
            console.error('Error saving relation:', err)
            setError(err.response?.data?.detail || 'Failed to save relation')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this relation?')) return

        try {
            setLoading(true)
            await bhsaAPI.deleteRelation(id)
            setRelations((prev: RelationResponse[]) => prev.filter((r: RelationResponse) => r.id !== id))

            if (aiSnapshot) {
                const original = relations.find(r => r.id === id)
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

    if (!passageData) {
        return <NoPassageState />
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className={stageHeaderStyles.title}>
                    <GitBranch className={stageHeaderStyles.icon} />
                    Stage 3: Participant Relations
                </h2>
                <p className={stageHeaderStyles.description}>
                    Define relationships between participants (Kinship, Social, etc.).
                </p>
            </div>

            {error && (
                <div className={errorStateStyles.banner}>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-preto">Existing Relations</h3>

                    {relations.length === 0 ? (
                        <NoRelationsState />
                    ) : (
                        <div className="space-y-3">
                            <ValidationHeader
                                validatedCount={validatedCount}
                                totalCount={relations.length}
                                allValidated={allValidated}
                                readOnly={readOnly}
                                isAdmin={isAdmin}
                                onValidateAll={() => validateAll('relations', relations.map(r => r.id))}
                            />

                            {relations.map(r => (
                                <RelationCard
                                    key={r.id || `${r.sourceId}-${r.targetId}`}
                                    relation={r}
                                    isValidated={validated.relations.has(r.id)}
                                    readOnly={readOnly}
                                    participants={participants}
                                    onToggleValidation={() => toggleValidation('relations', r.id)}
                                    onEdit={() => handleEdit(r)}
                                    onDelete={() => r.id && handleDelete(r.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <RelationForm
                        formData={formData}
                        participants={participants}
                        editingId={editingId}
                        loading={loading}
                        onFormChange={setFormData}
                        onSubmit={handleSubmit}
                        onCancel={resetForm}
                    />
                )}
            </div>
        </div>
    )
}

export default Stage3Relations
