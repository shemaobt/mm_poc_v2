import { useCallback } from 'react'
import { bhsaAPI } from '../../../../services/api'

interface UseBHSALoaderParams {
    setBhsaLoaded: (loaded: boolean) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setLoadingMessage: (message: string) => void
}

export function useBHSALoader({
    setBhsaLoaded,
    setLoading,
    setError,
    setLoadingMessage
}: UseBHSALoaderParams) {
    const autoLoadBHSA = useCallback(async () => {
        try {
            const status = await bhsaAPI.getStatus()
            if (status.bhsa_loaded) {
                setBhsaLoaded(true)
                return
            }

            setLoading(true)
            setLoadingMessage('Loading Text-Fabric data (ETCBC/bhsa)...')

            const response = await bhsaAPI.loadBHSA()

            if (response.status === 'already_loaded') {
                setBhsaLoaded(true)
                setLoading(false)
                setLoadingMessage('')
                return
            }

            let safetyTimeout: ReturnType<typeof setTimeout>

            const pollInterval = setInterval(async () => {
                try {
                    const pollStatus = await bhsaAPI.getStatus()
                    if (pollStatus.message) {
                        setLoadingMessage(pollStatus.message)
                    }

                    if (pollStatus.bhsa_loaded) {
                        clearInterval(pollInterval)
                        clearTimeout(safetyTimeout)
                        setBhsaLoaded(true)
                        setLoading(false)
                        setLoadingMessage('')
                    }
                } catch (err) {
                    console.error('Polling error:', err)
                }
            }, 1000)

            safetyTimeout = setTimeout(() => {
                clearInterval(pollInterval)
                setLoading(false)
                setError('Loading timed out. Please refresh the page.')
                setLoadingMessage('')
            }, 300000)

        } catch (err: any) {
            console.error('Failed to auto-load BHSA:', err)
            setError(err.response?.data?.detail || 'Failed to load BHSA data.')
            setLoading(false)
            setLoadingMessage('')
        }
    }, [setBhsaLoaded, setLoading, setError, setLoadingMessage])

    return { autoLoadBHSA }
}
