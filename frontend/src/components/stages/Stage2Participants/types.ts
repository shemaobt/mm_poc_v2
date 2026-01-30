import { ParticipantResponse, ParticipantCreate } from '../../../types'

export interface ParticipantCardProps {
    participant: ParticipantResponse
    isValidated: boolean
    readOnly: boolean
    onToggleValidation: () => void
    onEdit: () => void
    onDelete: () => void
}

export interface ParticipantFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formData: ParticipantCreate
    setFormData: React.Dispatch<React.SetStateAction<ParticipantCreate>>
    editingId: string | null
    loading: boolean
    onSubmit: () => void
    newPropDimension: string
    setNewPropDimension: (value: string) => void
    newPropValue: string
    setNewPropValue: (value: string) => void
    onAddProperty: () => void
    onRemoveProperty: (index: number) => void
}

export interface ValidationSummaryProps {
    validatedCount: number
    totalCount: number
    allValidated: boolean
    readOnly: boolean
    isAdmin: boolean
    onValidateAll: () => void
}

export interface EmptyStateProps {
    variant: 'no-passage' | 'no-participants'
}
