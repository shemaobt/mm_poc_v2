import * as React from "react"
import { cn } from "../../utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'divine' | 'place' | 'time' | 'person' | 'abstract' | 'object' | 'group' | 'success' | 'warning' | 'secondary' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variantClasses = {
            default: 'bg-areia/30 text-preto border-areia',
            divine: 'bg-amber-100 text-amber-800 border-amber-200',
            place: 'bg-azul/20 text-verde border-azul/30',
            time: 'bg-verde-claro/20 text-verde border-verde-claro/30',
            person: 'bg-telha/10 text-telha-dark border-telha/20',
            abstract: 'bg-purple-100 text-purple-800 border-purple-200',
            object: 'bg-gray-100 text-gray-800 border-gray-200',
            group: 'bg-blue-100 text-blue-800 border-blue-200',
            success: 'bg-verde-claro/20 text-verde-claro border-verde-claro/30',
            warning: 'bg-telha/10 text-telha border-telha/20',
            secondary: 'bg-gray-100 text-gray-800 border-gray-200',
            outline: 'bg-transparent border-gray-200 text-gray-800',
        }

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                    variantClasses[variant],
                    className
                )}
                {...props}
            />
        )
    }
)
Badge.displayName = "Badge"

export { Badge }
