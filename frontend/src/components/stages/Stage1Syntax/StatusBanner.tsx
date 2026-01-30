import { Loader2, FileText } from 'lucide-react'
import { errorStateStyles, infoStateStyles, readOnlyBannerStyles } from '@/styles'

interface StatusBannerProps {
    readOnly: boolean
    error: string | null
    loadingMessage: string
}

export function StatusBanner({ readOnly, error, loadingMessage }: StatusBannerProps) {
    return (
        <>
            {readOnly && (
                <div className={readOnlyBannerStyles.container}>
                    <FileText className={readOnlyBannerStyles.icon} />
                    <span className={readOnlyBannerStyles.text}>View only</span> — You can browse all stages but cannot edit this map.
                </div>
            )}

            {error && (
                <div className={`${errorStateStyles.banner} animate-in`}>
                    {error}
                </div>
            )}

            {loadingMessage && (
                <div className={`${infoStateStyles.banner} flex items-center gap-2 animate-in`}>
                    <Loader2 className={`${infoStateStyles.icon} animate-spin`} />
                    {loadingMessage}
                </div>
            )}
        </>
    )
}
