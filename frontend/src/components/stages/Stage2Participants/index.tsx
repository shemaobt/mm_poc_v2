import { useState, useEffect } from 'react'
import { usePassageStore } from '../../../stores/passageStore'
import { bhsaAPI } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { ParticipantResponse, ParticipantCreate } from '../../../types'
import { Button } from '../../ui/button'
import { Users, Plus } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { ValidationSummary } from './ValidationSummary'
import { ParticipantCard } from './ParticipantCard'
import { ParticipantFormModal } from './ParticipantFormModal'
import { stageHeaderStyles, errorStateStyles } from '@/styles'

function sortParticipants(participants: ParticipantResponse[]): ParticipantResponse[] {
    return [...participants].sort((a, b) => {
        const getNum = (id: string) => {
            const match = id.match(/^p(\d+)$/)
            return match ? parseInt(match[1]) : Infinity
        }
        const numA = getNum(a.participantId)
        const numB = getNum(b.participantId)

        if (numA !== Infinity && numB !== Infinity) {
            return numA - numB
        }
        return a.participantId.localeCompare(b.participantId, undefined, { numeric: true })
    })
}

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

    const [newPropDimension, setNewPropDimension] = useState<string>('')
    const [newPropValue, setNewPropValue] = useState<string>('')

    useEffect(() => {
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
                const original = participants.find(p => p.id === editingId)

                console.log('Sending update:', formData)
                const updated = await bhsaAPI.updateParticipant(editingId, formData)
                const idToUpdate = editingId
                setParticipants((prev: ParticipantResponse[]) => {
                    const prevItem = prev.find((p: ParticipantResponse) => p.id === idToUpdate)
                    const merged = prevItem ? { ...prevItem, ...updated } : updated
                    return prev.map((p: ParticipantResponse) => (p.id === idToUpdate ? merged : p))
                })

                if (aiSnapshot && original) {
                    const fields = ['hebrew', 'gloss', 'type', 'quantity', 'referenceStatus'] as const
                    fields.forEach(field => {
                        if (original[field] !== formData[field]) {
                            const wasAiGenerated = aiSnapshot.participants?.some((p: any) => p.hebrew === original.hebrew)
                            trackEdit('update', 'participant', editingId, field, original[field], formData[field], wasAiGenerated)
                        }
                    })
                }
            } else {
                const created = await bhsaAPI.createParticipant(passageData.id, formData)
                setParticipants((prev: ParticipantResponse[]) => [...prev, created])

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

    if (!passageData) {
        return <EmptyState variant="no-passage" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className={stageHeaderStyles.title}>
                        <Users className={stageHeaderStyles.icon} />
                        Stage 2: Participants
                    </h2>
                    <p className={stageHeaderStyles.description}>Identify and classify entities in the text.</p>
                </div>
                {!readOnly && (
                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Participant
                    </Button>
                )}
            </div>

            {error && (
                <div className={errorStateStyles.banner}>
                    {error}
                </div>
            )}

            {participants.length > 0 && (
                <ValidationSummary
                    validatedCount={validatedCount}
                    totalCount={participants.length}
                    allValidated={allValidated}
                    readOnly={readOnly}
                    isAdmin={isAdmin}
                    onValidateAll={() => validateAll('participants', participants.map(p => p.id))}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortParticipants(participants).map((p, index) => (
                    <ParticipantCard
                        key={p.id || `temp-${p.participantId}-${index}`}
                        participant={p}
                        isValidated={isValidated(p.id)}
                        readOnly={readOnly}
                        onToggleValidation={() => toggleValidation('participants', p.id)}
                        onEdit={() => handleEdit(p)}
                        onDelete={() => handleDelete(p.id)}
                    />
                ))}
            </div>

            {participants.length === 0 && <EmptyState variant="no-participants" />}

            <ParticipantFormModal
                open={showModal}
                onOpenChange={setShowModal}
                formData={formData}
                setFormData={setFormData}
                editingId={editingId}
                loading={loading}
                onSubmit={handleSubmit}
                newPropDimension={newPropDimension}
                setNewPropDimension={setNewPropDimension}
                newPropValue={newPropValue}
                setNewPropValue={setNewPropValue}
                onAddProperty={addProperty}
                onRemoveProperty={removeProperty}
            />
        </div>
    )
}

export default Stage2Participants
