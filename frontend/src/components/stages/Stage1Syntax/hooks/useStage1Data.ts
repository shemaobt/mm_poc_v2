import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePassageStore } from '../../../../stores/passageStore'
import { bhsaAPI, passagesAPI, pericopesAPI, Pericope } from '../../../../services/api'
import { useAuth } from '../../../../contexts/AuthContext'
import { toast } from 'sonner'
import { usePericopeLock } from './usePericopeLock'
import { usePericopeData } from './usePericopeData'
import { useBHSALoader } from './useBHSALoader'
import { usePassageActions } from './usePassageActions'
import { ExistingPassage, PreviewData, DisplayUnit, hasPartialVerseIndicator, stripPartialVerseIndicators } from '../types'

export function useStage1Data() {
    const {
        passageData, readOnly, setPassageData, bhsaLoaded, setBhsaLoaded, loading, setLoading, error, setError,
        clearPassage, discardSession,
        checkedClauses, setCheckedClauses, toggleClauseCheck,

    } = usePassageStore()
    const { isAdmin, user } = useAuth()
    const { currentLock, setCurrentLock, acquireLock, releaseLock, startHeartbeat } = usePericopeLock()

    const [reference, setReference] = useState('')
    const [loadingMessage, setLoadingMessage] = useState('')
    const [showAIModal, setShowAIModal] = useState(false)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const [existingPassages, setExistingPassages] = useState<ExistingPassage[]>([])
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
    const [previewData, setPreviewData] = useState<PreviewData | null>(null)
    const [isPreviewMode, setIsPreviewMode] = useState(false)

    const pericopeData = usePericopeData({ userId: user?.id })
    const { autoLoadBHSA } = useBHSALoader({ setBhsaLoaded, setLoading, setError, setLoadingMessage })

    const passageActions = usePassageActions({
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
    })

    const fetchExistingPassages = useCallback(async () => {
        try {
            const passages = await passagesAPI.list()
            setExistingPassages(passages || [])
        } catch (err) {
            console.error('Failed to fetch existing passages:', err)
        }
    }, [])

    const checkAndRestoreUserLock = useCallback(async () => {
        if (readOnly) return
        try {
            const locks = await pericopesAPI.getLocks()
            const myLock = locks.find(lock => lock.userId === user?.id)

            if (myLock) {
                setCurrentLock(myLock.pericopeRef)
                setReference(myLock.pericopeRef)
                pericopeData.setSearchTerm(myLock.pericopeRef)
                setIsPreviewMode(false)
                setPreviewData(null)

                const pericopesList = await pericopesAPI.list({ search: myLock.pericopeRef, limit: 10 })
                const matchingPericope = pericopesList.find(p => p.reference === myLock.pericopeRef)
                if (matchingPericope) {
                    pericopeData.setSelectedPericope(matchingPericope)
                }

                startHeartbeat(myLock.pericopeRef)

                if (!passageData || passageData.reference !== myLock.pericopeRef) {
                    toast.info('Restoring your session', {
                        description: `You were working on ${myLock.pericopeRef}`
                    })

                    try {
                        setLoading(true)
                        setLoadingMessage('Restoring your previous session...')
                        const data = await bhsaAPI.fetchPassage(myLock.pericopeRef)

                        if (data.id || data.passage_id) {
                            setPassageData({
                                id: data.id || data.passage_id,
                                reference: data.reference,
                                source_lang: data.source_lang || 'Hebrew',
                                clauses: data.clauses,
                                display_units: data.display_units
                            })
                        }
                    } catch (err) {
                        console.error('Failed to restore session:', err)
                    } finally {
                        setLoading(false)
                        setLoadingMessage('')
                    }
                }
            } else {
                if (passageData) {
                    clearPassage()
                }
                setIsPreviewMode(false)
                setPreviewData(null)
            }
        } catch (err) {
            console.error('Failed to check user locks:', err)
        }
    }, [readOnly, user?.id, passageData, setCurrentLock, startHeartbeat, setLoading, setPassageData, clearPassage, pericopeData])

    useEffect(() => {
        autoLoadBHSA()
        fetchExistingPassages()
        checkAndRestoreUserLock()
    }, [])

    useEffect(() => {
        if (reference.trim() && existingPassages.length > 0) {
            const normalizedRef = reference.toLowerCase().trim()
            const existing = existingPassages.find(p =>
                p.reference.toLowerCase().includes(normalizedRef) ||
                normalizedRef.includes(p.reference.toLowerCase())
            )
            if (existing) {
                setDuplicateWarning(`Similar passage "${existing.reference}" already exists${existing.isComplete ? ' (Complete)' : ''}`)
            } else {
                setDuplicateWarning(null)
            }
        } else {
            setDuplicateWarning(null)
        }
    }, [reference, existingPassages])

    const handleSelectPericope = useCallback((pericope: Pericope) => {
        if (pericope.lock && pericope.lock.userId !== user?.id) {
            toast.error('Pericope Locked', {
                description: `This pericope is being analyzed by ${pericope.lock.userName}`
            })
            return
        }

        if (hasPartialVerseIndicator(pericope.reference)) {
            const cleanRef = stripPartialVerseIndicators(pericope.reference)
            toast.warning('Partial Verse Reference', {
                description: `This pericope uses partial verses. BHSA will load full verses: "${cleanRef}"`,
                duration: 5000
            })
        }

        pericopeData.setSelectedPericope(pericope)
        setReference(pericope.reference)
        pericopeData.setSearchTerm(pericope.reference)
        pericopeData.setShowDropdown(false)
    }, [user?.id, pericopeData])

    const handleSearchTermChange = useCallback((term: string) => {
        pericopeData.setSearchTerm(term)
        pericopeData.setSelectedPericope(null)
        setReference('')
        pericopeData.setShowDropdown(true)
    }, [pericopeData])

    const handleCancelPreview = useCallback(() => {
        setPreviewData(null)
        setIsPreviewMode(false)
        pericopeData.setSelectedPericope(null)
        setReference('')
        pericopeData.setSearchTerm('')
    }, [pericopeData])

    const allClausesChecked = passageData?.clauses ? passageData.clauses.every((c: any) => checkedClauses.has(c.clause_id?.toString() || c.id?.toString())) : false
    const mainlineClauses = passageData?.clauses?.filter((c: any) => c.is_mainline) || []
    const backgroundClauses = passageData?.clauses?.filter((c: any) => !c.is_mainline) || []

    const displayUnits = useMemo((): DisplayUnit[] => {
        const clauses = passageData?.clauses ?? []
        const units = passageData?.display_units
        if (units?.length && units.every((u: any) => u?.clause_ids?.length)) {
            const allIds = new Set(clauses.map((c: any) => c.clause_id))
            const covered = new Set<number>()
            for (const u of units) {
                for (const id of u.clause_ids) {
                    if (allIds.has(id)) covered.add(id)
                }
            }
            if (covered.size === allIds.size) return units
        }
        return clauses.map((c: any) => ({ clause_ids: [c.clause_id], merged: false }))
    }, [passageData?.clauses, passageData?.display_units])

    const mergedUnitsCount = displayUnits.filter((u) => u.merged && u.clause_ids?.length > 1).length

    return {
        passageData,
        readOnly,
        bhsaLoaded,
        loading,
        error,
        loadingMessage,
        checkedClauses,
        toggleClauseCheck,
        isAdmin,
        showAIModal,
        setShowAIModal,
        showDiscardConfirm,
        setShowDiscardConfirm,
        existingPassages,
        duplicateWarning,
        previewData,
        isPreviewMode,
        pericopes: pericopeData.pericopes,
        books: pericopeData.books,
        selectedBook: pericopeData.selectedBook,
        setSelectedBook: pericopeData.setSelectedBook,
        searchTerm: pericopeData.searchTerm,
        filterByUser: pericopeData.filterByUser,
        setFilterByUser: pericopeData.setFilterByUser,
        contributors: pericopeData.contributors,
        showDropdown: pericopeData.showDropdown,
        setShowDropdown: pericopeData.setShowDropdown,
        selectedPericope: pericopeData.selectedPericope,
        setReference,
        handleSelectPericope,
        handleSearchTermChange,
        handleFetchPassage: passageActions.handleFetchPassage,
        handleStartAnalysis: passageActions.handleStartAnalysis,
        handleCancelPreview,
        handleDiscardSession: passageActions.handleDiscardSession,

        handleValidateAll: passageActions.handleValidateAll,
        allClausesChecked,
        mainlineClauses,
        backgroundClauses,
        displayUnits,
        mergedUnitsCount
    }
}
