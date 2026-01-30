export const emptyStateStyles = {
    container: 'py-12 text-center text-verde/60',
    icon: 'w-12 h-12 mx-auto mb-4 opacity-30',
    text: 'text-sm',
} as const

export const loadingStateStyles = {
    container: 'flex items-center justify-center py-12',
    spinner: 'w-8 h-8 animate-spin text-telha',
    smallSpinner: 'w-4 h-4 animate-spin text-telha',
    text: 'text-verde ml-3',
} as const

export const errorStateStyles = {
    banner: 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg',
    icon: 'w-4 h-4 text-red-600',
    text: 'text-sm',
} as const

export const successStateStyles = {
    banner: 'bg-verde-claro/10 border border-verde-claro/30 text-verde px-4 py-3 rounded-lg',
    icon: 'w-4 h-4 text-verde-claro',
    text: 'text-sm',
} as const

export const warningStateStyles = {
    banner: 'bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg',
    icon: 'w-4 h-4 text-yellow-600',
    text: 'text-sm',
} as const

export const infoStateStyles = {
    banner: 'bg-azul/10 border border-azul/30 text-verde px-4 py-3 rounded-lg',
    icon: 'w-4 h-4 text-azul',
    text: 'text-sm',
} as const

export const readOnlyBannerStyles = {
    container: 'bg-azul/10 border border-azul/30 text-verde px-4 py-3 rounded-lg flex items-center gap-2',
    icon: 'w-4 h-4 text-azul',
    text: 'text-sm font-medium',
} as const

export const validationProgressStyles = {
    container: 'flex items-center gap-4',
    bar: 'flex-1 h-2 bg-areia/30 rounded-full overflow-hidden',
    fill: 'h-full bg-verde-claro transition-all duration-300',
    text: 'text-sm text-verde whitespace-nowrap',
} as const
