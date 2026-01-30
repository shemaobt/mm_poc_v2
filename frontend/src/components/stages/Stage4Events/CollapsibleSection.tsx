import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SectionVariant, sectionStyles } from '@/styles'

interface CollapsibleSectionProps {
    title: string
    emoji?: string
    icon?: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    defaultOpen?: boolean
    count?: number
    variant?: SectionVariant
    helpText?: string
}

export function CollapsibleSection({
    title,
    emoji,
    icon: Icon,
    children,
    defaultOpen = false,
    count,
    variant = 'default',
    helpText
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const styles = sectionStyles[variant]

    return (
        <div className={`border rounded-lg overflow-hidden ${styles.border}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3 ${styles.header} transition-colors`}
            >
                <div className="flex items-center gap-2">
                    {emoji && <span className="text-lg">{emoji}</span>}
                    {Icon && !emoji && <Icon className="w-4 h-4 text-telha" />}
                    <span className="font-medium text-preto">{title}</span>
                    {count !== undefined && (
                        <span className="text-xs bg-verde/10 text-verde px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                    {helpText && (
                        <span className="text-xs text-verde/60 ml-2">{helpText}</span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-verde" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-verde" />
                )}
            </button>
            {isOpen && (
                <div className={`p-4 border-t border-areia/30 ${styles.content}`}>
                    {children}
                </div>
            )}
        </div>
    )
}
