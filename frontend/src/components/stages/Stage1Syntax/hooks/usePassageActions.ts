import { useCallback } from 'react'
import { bhsaAPI, passagesAPI } from '../../../../services/api'
import { toast } from 'sonner'
import { PreviewData, stripPartialVerseIndicators } from '../types'

interface UsePassageActionsParams {
    reference: string
    previewData: PreviewData | null
    currentLock: string | null
    passageData: any

    setLoading: (loading: boolean) => void
    setLoadingMessage: (message: string) => void
    setError: (error: string | null) => void
    setPassageData: (data: any) => void
    setCheckedClauses: (clauses: Set<string>) => void
    setPreviewData: (data: PreviewData | null) => void
    setIsPreviewMode: (mode: boolean) => void
    clearPassage: () => void
    discardSession: () => void
    acquireLock: (ref: string) => Promise<boolean>
    releaseLock: (ref?: string) => Promise<void>
    setReference: (ref: string) => void
    setShowDiscardConfirm: (show: boolean) => void
}

export function usePassageActions({
    reference,
    previewData,
    currentLock,
    passageData,

    setLoading,
    setLoadingMessage,
    setError,
    setPassageData,
    setCheckedClauses,
    setPreviewData,
    setIsPreviewMode,
    clearPassage,
    discardSession,
    acquireLock,
    releaseLock,
    setReference,
    setShowDiscardConfirm
}: UsePassageActionsParams) {
    const handleFetchPassage = useCallback(async () => {
        if (!reference.trim()) return

        const cleanReference = stripPartialVerseIndicators(reference)
        const hadPartialVerse = cleanReference !== reference

        if (hadPartialVerse) {
            toast.warning('Using Full Verses', {
                description: `Partial verse reference adjusted to: "${cleanReference}"`,
                duration: 4000
            })
        }

        try {
            clearPassage()
            setPreviewData(null)
            setIsPreviewMode(false)
            setLoading(true)
            setLoadingMessage('Fetching passage preview from BHSA...')
            setError(null)

            const data = await bhsaAPI.fetchPassage(cleanReference, true)

            if (data.clauses && data.clauses.length > 0) {
                const mainlineCount = data.clauses.filter((c: any) => c.is_mainline).length
                const backgroundCount = data.clauses.filter((c: any) => !c.is_mainline).length

                setPreviewData({
                    reference: data.reference,
                    clauseCount: data.clauses.length,
                    mainline: mainlineCount,
                    background: backgroundCount
                })
                setIsPreviewMode(true)
                setLoadingMessage('')
            } else {
                setError('No clauses found for this passage.')
                setLoadingMessage('')
            }

        } catch (err: any) {
            console.error('Failed to fetch passage:', err)
            setError(err.response?.data?.detail || 'Failed to fetch passage.')
            setLoadingMessage('')
        } finally {
            setLoading(false)
        }
    }, [reference, clearPassage, setLoading, setError, setLoadingMessage, setPreviewData, setIsPreviewMode])

    const handleStartAnalysis = useCallback(async () => {
        if (!reference.trim() || !previewData) return

        const cleanReference = stripPartialVerseIndicators(reference)

        try {
            if (currentLock && currentLock !== cleanReference) {
                await releaseLock(currentLock)
            }

            const lockAcquired = await acquireLock(cleanReference)
            if (!lockAcquired) {
                return
            }

            setLoading(true)
            setLoadingMessage('Starting analysis...')
            setError(null)

            const data = await bhsaAPI.fetchPassage(cleanReference)

            if (data.id || data.passage_id) {
                setPassageData({
                    id: data.id || data.passage_id,
                    reference: data.reference,
                    source_lang: data.source_lang || 'Hebrew',
                    clauses: data.clauses,
                    display_units: data.display_units
                })
                setCheckedClauses(new Set())
                setIsPreviewMode(false)
                setPreviewData(null)
                setLoadingMessage('')
            } else {
                console.warn("BHSA response missing passage ID, creating...")
                try {
                    const persisted = await passagesAPI.create({
                        reference: data.reference,
                        sourceLang: 'hbo'
                    })
                    setPassageData({
                        id: persisted.id,
                        reference: data.reference,
                        source_lang: data.source_lang || 'Hebrew',
                        clauses: data.clauses,
                        display_units: data.display_units
                    })
                    setCheckedClauses(new Set())
                    setIsPreviewMode(false)
                    setPreviewData(null)
                } catch (persistErr) {
                    console.error("Failed to persist passage:", persistErr)
                    setError("Failed to initialize passage session. Database error.")
                }
                setLoadingMessage('')
            }

        } catch (err: any) {
            console.error('Failed to start analysis:', err)
            setError(err.response?.data?.detail || 'Failed to start analysis.')
            setLoadingMessage('')
        } finally {
            setLoading(false)
        }
    }, [reference, previewData, currentLock, releaseLock, acquireLock, setLoading, setError, setPassageData, setCheckedClauses, setLoadingMessage, setPreviewData, setIsPreviewMode])

    const handleDiscardSession = useCallback(() => {
        if (currentLock) {
            releaseLock()
        }
        discardSession()
        setShowDiscardConfirm(false)
        setReference('')
        toast.success('Session discarded', {
            description: 'You can now start a new analysis'
        })
    }, [currentLock, releaseLock, discardSession, setShowDiscardConfirm, setReference])



    const handleValidateAll = useCallback(() => {
        if (passageData?.clauses) {
            const ids: string[] = passageData.clauses
                .map((c: { clause_id?: number; id?: string }) => c.clause_id?.toString() ?? c.id?.toString() ?? '')
                .filter((id: string) => id !== '')
            setCheckedClauses(new Set(ids))
        }
    }, [passageData?.clauses, setCheckedClauses])

    return {
        handleFetchPassage,
        handleStartAnalysis,
        handleDiscardSession,

        handleValidateAll
    }
}
