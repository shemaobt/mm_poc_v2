export type SectionVariant = 
    | 'default' 
    | 'roles' 
    | 'modifiers' 
    | 'pragmatic' 
    | 'emotion' 
    | 'la-tags' 
    | 'figurative' 
    | 'key-terms' 
    | 'speech'
    | 'narrator'

export interface SectionStyle {
    header: string
    content: string
    border: string
}

export const sectionStyles: Record<SectionVariant, SectionStyle> = {
    default: {
        header: 'bg-areia/10 hover:bg-areia/20',
        content: 'bg-white',
        border: 'border-areia/30',
    },
    roles: {
        header: 'bg-amber-50 hover:bg-amber-100',
        content: 'bg-amber-50/50',
        border: 'border-l-4 border-l-amber-400 border-areia/30',
    },
    modifiers: {
        header: 'bg-slate-50 hover:bg-slate-100',
        content: 'bg-white',
        border: 'border-areia/30',
    },
    pragmatic: {
        header: 'bg-yellow-50 hover:bg-yellow-100',
        content: 'bg-yellow-50/50',
        border: 'border-areia/30',
    },
    emotion: {
        header: 'bg-pink-50 hover:bg-pink-100',
        content: 'bg-pink-50/50',
        border: 'border-areia/30',
    },
    'la-tags': {
        header: 'bg-emerald-50 hover:bg-emerald-100',
        content: 'bg-emerald-50/50',
        border: 'border-areia/30',
    },
    figurative: {
        header: 'bg-purple-50 hover:bg-purple-100',
        content: 'bg-purple-50/50',
        border: 'border-areia/30',
    },
    'key-terms': {
        header: 'bg-orange-50 hover:bg-orange-100',
        content: 'bg-orange-50/50',
        border: 'border-areia/30',
    },
    speech: {
        header: 'bg-blue-50 hover:bg-blue-100',
        content: 'bg-blue-50/50',
        border: 'border-areia/30',
    },
    narrator: {
        header: 'bg-indigo-50 hover:bg-indigo-100',
        content: 'bg-indigo-50/50',
        border: 'border-areia/30',
    },
} as const
