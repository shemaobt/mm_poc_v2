export type ParticipantCategory = 
    | 'divine' 
    | 'person' 
    | 'place' 
    | 'time' 
    | 'object' 
    | 'abstract' 
    | 'group'
    | 'animal'

export type DiscourseCategory = 
    | 'temporal'
    | 'logical'
    | 'rhetorical'
    | 'narrative'

export const participantCategoryColors: Record<ParticipantCategory, string> = {
    divine: 'bg-amber-100 text-amber-800 border-amber-200',
    person: 'bg-telha/10 text-telha-dark border-telha/20',
    place: 'bg-azul/20 text-verde border-azul/30',
    time: 'bg-verde-claro/20 text-verde border-verde-claro/30',
    object: 'bg-gray-100 text-gray-800 border-gray-200',
    abstract: 'bg-areia/30 text-preto border-areia',
    group: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    animal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
} as const

export const discourseCategoryColors: Record<DiscourseCategory, string> = {
    temporal: 'bg-blue-100 text-blue-800',
    logical: 'bg-purple-100 text-purple-800',
    rhetorical: 'bg-orange-100 text-orange-800',
    narrative: 'bg-emerald-100 text-emerald-800',
} as const

export const validationBadgeStyles = {
    validated: 'bg-verde-claro/20 text-verde-claro border-verde-claro/30',
    pending: 'bg-areia/30 text-verde border-areia',
    error: 'bg-red-100 text-red-800 border-red-200',
} as const

export const roleBadgeStyles = {
    agent: 'bg-amber-100 text-amber-800',
    patient: 'bg-blue-100 text-blue-800',
    experiencer: 'bg-purple-100 text-purple-800',
    instrument: 'bg-gray-100 text-gray-800',
    beneficiary: 'bg-green-100 text-green-800',
    location: 'bg-cyan-100 text-cyan-800',
    source: 'bg-orange-100 text-orange-800',
    goal: 'bg-pink-100 text-pink-800',
} as const

export type EventCategory =
    | 'ACTION'
    | 'SPEECH'
    | 'MOTION'
    | 'STATE'
    | 'PROCESS'
    | 'TRANSFER'
    | 'INTERNAL'
    | 'RITUAL'
    | 'META'

export const eventCategoryColors: Record<EventCategory, string> = {
    ACTION: 'bg-telha/10 text-telha border-telha/20',
    SPEECH: 'bg-azul/20 text-verde border-azul/30',
    MOTION: 'bg-verde-claro/20 text-verde border-verde-claro/30',
    STATE: 'bg-areia/30 text-verde border-areia',
    PROCESS: 'bg-purple-100 text-purple-800 border-purple-200',
    TRANSFER: 'bg-blue-100 text-blue-800 border-blue-200',
    INTERNAL: 'bg-pink-100 text-pink-800 border-pink-200',
    RITUAL: 'bg-amber-100 text-amber-800 border-amber-200',
    META: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

export const fieldIndicatorStyles = {
    roles: 'bg-amber-50 text-amber-700 border-amber-200',
    modifiers: 'bg-slate-50 text-slate-700 border-slate-200',
    speech: 'bg-blue-50 text-blue-700 border-blue-200',
    pragmatic: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    emotions: 'bg-pink-50 text-pink-700 border-pink-200',
    viewpoint: 'bg-rose-50 text-rose-700 border-rose-200',
    figurative: 'bg-purple-50 text-purple-700 border-purple-200',
    keyTerms: 'bg-orange-50 text-orange-700 border-orange-200',
    laTags: 'bg-emerald-50 text-emerald-700 border-emerald-200',
} as const
