import { BookOpen, CheckCircle2, Loader2 } from 'lucide-react'
import { pageStyles, stageHeaderStyles, loadingStateStyles } from '@/styles'

interface StageHeaderProps {
    bhsaLoaded: boolean
}

export function StageHeader({ bhsaLoaded }: StageHeaderProps) {
    return (
        <div className={pageStyles.header}>
            <div>
                <h2 className={stageHeaderStyles.title}>
                    <BookOpen className={stageHeaderStyles.icon} />
                    Stage 1: Syntax
                </h2>
                <p className={stageHeaderStyles.description}>Load clause data and review mainline/background status.</p>
            </div>

            {bhsaLoaded ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-verde-claro/10 text-verde-claro border border-verde-claro/20">
                    <CheckCircle2 className="w-4 h-4" />
                    BHSA Ready
                </div>
            ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-areia/50 text-verde border border-areia">
                    <Loader2 className={loadingStateStyles.smallSpinner} />
                    Loading BHSA...
                </div>
            )}
        </div>
    )
}
