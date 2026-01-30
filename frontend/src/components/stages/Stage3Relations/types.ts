import { ParticipantResponse, RelationCreate, RelationResponse } from '../../../types'

export interface RelationFormData extends RelationCreate {}

export interface RelationCardProps {
    relation: RelationResponse
    isValidated: boolean
    readOnly: boolean
    participants: ParticipantResponse[]
    onToggleValidation: () => void
    onEdit: () => void
    onDelete: () => void
}

export interface RelationFormProps {
    formData: RelationFormData
    participants: ParticipantResponse[]
    editingId: string | null
    loading: boolean
    onFormChange: (data: RelationFormData) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
}

export interface ValidationHeaderProps {
    validatedCount: number
    totalCount: number
    allValidated: boolean
    readOnly: boolean
    isAdmin: boolean
    onValidateAll: () => void
}

export interface ParticipantSelectProps {
    value: string
    participants: ParticipantResponse[]
    placeholder: string
    onValueChange: (value: string) => void
}
