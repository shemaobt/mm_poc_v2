import { EventCreate, EventResponse, EventRoleBase, EventModifier, EventEmotion, KeyTerm, ParticipantResponse } from '../../../types'

export interface SegmentOption {
    value: string
    label: string
}

export interface EventFormData extends EventCreate {
    clauseId?: string
}

export interface EventCardProps {
    event: EventResponse
    participants: ParticipantResponse[]
    passageData: any
    dbClauses: any[]
    isValidated: boolean
    readOnly: boolean
    onValidate: () => void
    onEdit: () => void
    onDelete: () => void
}

export interface EventModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formData: EventFormData
    setFormData: (data: EventFormData) => void
    participants: ParticipantResponse[]
    segmentOptions: SegmentOption[]
    editingId: string | null
    loading: boolean
    error: string | null
    onSubmit: () => void
}

export interface RolesSectionProps {
    roles: EventRoleBase[]
    participants: ParticipantResponse[]
    onAddRole: () => void
    onUpdateRole: (index: number, field: keyof EventRoleBase, value: string | null) => void
    onRemoveRole: (index: number) => void
}

export interface ModifiersSectionProps {
    modifiers: EventModifier
    onUpdateModifier: (key: keyof EventModifier, value: string) => void
}

export interface SpeechActSectionProps {
    speechAct: { type?: string; quotationType?: string }
    onChange: (speechAct: { type?: string; quotationType?: string }) => void
}

export interface PragmaticSectionProps {
    pragmatic: { register?: string; socialAxis?: string; prominence?: string; pacing?: string }
    onChange: (pragmatic: { register?: string; socialAxis?: string; prominence?: string; pacing?: string }) => void
}

export interface EmotionsSectionProps {
    emotions: EventEmotion[]
    participants: ParticipantResponse[]
    onAddEmotion: () => void
    onUpdateEmotion: (index: number, field: keyof EventEmotion, value: string) => void
    onRemoveEmotion: (index: number) => void
}

export interface NarratorAudienceSectionProps {
    narratorStance: { stance?: string }
    audienceResponse: { response?: string }
    onNarratorChange: (stance: { stance?: string }) => void
    onAudienceChange: (response: { response?: string }) => void
}

export interface FigurativeSectionProps {
    figurative: {
        isFigurative?: boolean
        figureType?: string
        transferability?: string
        sourceDomain?: string
        targetDomain?: string
        literalMeaning?: string
        intendedMeaning?: string
        translationNote?: string
    }
    onChange: (figurative: FigurativeSectionProps['figurative']) => void
}

export interface KeyTermsSectionProps {
    keyTerms: KeyTerm[]
    onAddKeyTerm: () => void
    onUpdateKeyTerm: (index: number, field: keyof KeyTerm, value: string) => void
    onRemoveKeyTerm: (index: number) => void
}

export interface LATagsSectionProps {
    laRetrieval: {
        emotionTags?: string[]
        eventTags?: string[]
        registerTags?: string[]
        discourseTags?: string[]
        socialTags?: string[]
    }
    onChange: (laRetrieval: LATagsSectionProps['laRetrieval']) => void
}
