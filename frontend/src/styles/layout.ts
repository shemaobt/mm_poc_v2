export const pageStyles = {
    container: 'space-y-6',
    header: 'flex items-start justify-between',
    title: 'text-2xl font-bold text-preto flex items-center gap-2',
    subtitle: 'text-verde mt-1',
    actions: 'flex items-center gap-2',
} as const

export const stageHeaderStyles = {
    icon: 'w-6 h-6 text-telha',
    title: 'text-2xl font-bold text-preto flex items-center gap-2',
    description: 'text-verde mt-1',
} as const

export const gridStyles = {
    twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    fourColumn: 'grid grid-cols-2 md:grid-cols-4 gap-4',
} as const

export const formStyles = {
    group: 'space-y-2',
    label: 'text-sm font-medium text-preto',
    hint: 'text-xs text-verde/60',
    error: 'text-xs text-red-600',
} as const

export const modalStyles = {
    header: 'text-lg font-semibold text-preto',
    description: 'text-sm text-verde',
    footer: 'flex justify-end gap-2 pt-4',
} as const
