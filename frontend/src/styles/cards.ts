export const cardStyles = {
    base: 'bg-white rounded-lg border border-areia/30 shadow-sm',
    hover: 'transition-all duration-200 hover:shadow-md hover:border-telha/30',
    dashed: 'border-dashed',
    selected: 'ring-2 ring-telha/50 border-telha',
} as const

export const clauseCardStyles = {
    base: 'bg-white rounded-lg border border-areia/30 p-4 transition-all duration-200 hover:shadow-md hover:border-telha/30',
    mainline: 'border-l-4 border-l-telha',
    background: 'border-l-4 border-l-azul',
} as const

export const eventCardStyles = {
    base: 'bg-white rounded-lg border border-areia/30 p-4',
    validated: 'border-verde-claro/50 bg-verde-claro/5',
    error: 'border-red-300 bg-red-50',
} as const

export const participantCardStyles = {
    base: 'bg-white rounded-lg border border-areia/30 p-4 transition-all duration-200',
    validated: 'border-verde-claro/50 bg-verde-claro/5',
    hover: 'hover:shadow-md hover:border-telha/30',
} as const
