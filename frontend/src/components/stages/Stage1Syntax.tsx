import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI, passagesAPI, pericopesAPI, Pericope, PericopeContributor } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import AIProcessingModal from '../common/AIProcessingModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { CheckCircle2, Search, Sparkles, BookOpen, Loader2, FileText, AlertTriangle, ChevronDown, Filter, Check, Lock, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExistingPassage {
    id: string
    reference: string
    isComplete: boolean
    createdAt: string
}



/**
 * Check if a pericope reference contains partial verse indicators (a, b, c, etc.)
 * BHSA data uses full verses, so these will be expanded to full verses.
 * Examples: "Ruth 1:19b-2:2", "Ruth 1:8-19a", "Genesis 1:1a"
 */
const hasPartialVerseIndicator = (reference: string): boolean => {
    // Pattern to detect verse numbers followed by a, b, c, etc.
    // Matches: :19a, :19b, :1a, :22c, etc. (also at end of string)
    const partialVersePattern = /:\d+[a-z]/i
    return partialVersePattern.test(reference)
}

/**
 * Strip partial verse indicators from a reference to get full verses.
 * E.g., "Ruth 1:8-19a" -> "Ruth 1:8-19"
 * E.g., "Ruth 1:19b-2:2" -> "Ruth 1:19-2:2"
 */
const stripPartialVerseIndicators = (reference: string): string => {
    // Remove letter suffixes after verse numbers (e.g., :19a -> :19, :2b -> :2)
    return reference.replace(/:(\d+)[a-z]/gi, ':$1')
}

function Stage1Syntax() {
    const {
        passageData, readOnly, setPassageData, bhsaLoaded, setBhsaLoaded, loading, setLoading, error, setError,
        clearPassage, discardSession,
        checkedClauses, setCheckedClauses, toggleClauseCheck,
        setEvents
    } = usePassageStore()
    const [reference, setReference] = useState('')
    const [loadingMessage, setLoadingMessage] = useState('')
    const [showAIModal, setShowAIModal] = useState(false)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const [existingPassages, setExistingPassages] = useState<ExistingPassage[]>([])
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
    const { isAdmin, user } = useAuth()

    // Lock state
    const [currentLock, setCurrentLock] = useState<string | null>(null) // Reference of currently held lock
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Preview mode: show skeleton without locking until user clicks "Start"
    const [previewData, setPreviewData] = useState<{ reference: string; clauseCount: number; mainline: number; background: number } | null>(null)
    const [isPreviewMode, setIsPreviewMode] = useState(false)

    // Lock management functions
    const acquireLock = useCallback(async (ref: string): Promise<boolean> => {
        try {
            await pericopesAPI.lock(ref)
            setCurrentLock(ref)

            // Start heartbeat to keep lock alive (every 30 seconds)
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
            }
            heartbeatRef.current = setInterval(async () => {
                try {
                    await pericopesAPI.heartbeat(ref)
                } catch (err) {
                    console.error('Heartbeat failed:', err)
                }
            }, 30000)

            return true
        } catch (err: any) {
            if (err.response?.status === 409) {
                const detail = err.response?.data?.detail
                toast.error('Pericope Locked', {
                    description: detail?.message || 'This pericope is being analyzed by another user'
                })
            } else {
                console.error('Failed to acquire lock:', err)
            }
            return false
        }
    }, [])

    const releaseLock = useCallback(async (ref?: string) => {
        const refToRelease = ref || currentLock
        if (!refToRelease) return

        try {
            await pericopesAPI.unlock(refToRelease)
        } catch (err) {
            console.error('Failed to release lock:', err)
        } finally {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
                heartbeatRef.current = null
            }
            setCurrentLock(null)
        }
    }, [currentLock])

    // Clean up lock on unmount or when passage changes
    useEffect(() => {
        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
            }
            // Note: Can't reliably call async unlock on unmount
            // Lock will be cleaned up by TTL or when user starts new analysis
        }
    }, [])

    // Pericopes state
    const [pericopes, setPericopes] = useState<Pericope[]>([])
    const [books, setBooks] = useState<string[]>([])
    const [selectedBook, setSelectedBook] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterByUser, setFilterByUser] = useState<string>('') // '' = All, 'mine' = current user, or user id
    const [contributors, setContributors] = useState<PericopeContributor[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedPericope, setSelectedPericope] = useState<Pericope | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Always check backend status on mount to ensure synchronization
        // even if frontend thinks it is loaded (persistence might be stale if backend restarted)
        autoLoadBHSA()
        fetchExistingPassages()
        fetchBooks()
        fetchPericopes()
        checkAndRestoreUserLock()
    }, [])

    // Check if user has an existing lock and restore the session
    const checkAndRestoreUserLock = async () => {
        if (readOnly) return
        try {
            const locks = await pericopesAPI.getLocks()
            const myLock = locks.find(lock => lock.userId === user?.id)

            if (myLock) {
                // User has an active lock - restore the session (skip preview mode)
                setCurrentLock(myLock.pericopeRef)
                setReference(myLock.pericopeRef)
                setSearchTerm(myLock.pericopeRef)
                setIsPreviewMode(false) // Skip preview, they already started
                setPreviewData(null)

                // Find the pericope in the list and select it
                const pericopes = await pericopesAPI.list({ search: myLock.pericopeRef, limit: 10 })
                const matchingPericope = pericopes.find(p => p.reference === myLock.pericopeRef)
                if (matchingPericope) {
                    setSelectedPericope(matchingPericope)
                }

                // Start heartbeat for the existing lock
                if (heartbeatRef.current) {
                    clearInterval(heartbeatRef.current)
                }
                heartbeatRef.current = setInterval(async () => {
                    try {
                        await pericopesAPI.heartbeat(myLock.pericopeRef)
                    } catch (err) {
                        console.error('Heartbeat failed:', err)
                    }
                }, 30000)

                // Auto-fetch the passage data if not already loaded or different
                if (!passageData || passageData.reference !== myLock.pericopeRef) {
                    toast.info('Restoring your session', {
                        description: `You were working on ${myLock.pericopeRef}`
                    })

                    // Fetch the passage directly (no preview needed, already locked)
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
                // If passageData matches the lock, keep it (already have correct data)
            } else {
                // NO active lock - clear any stale persisted passage data
                // User must explicitly choose and fetch a new pericope
                if (passageData) {
                    clearPassage()
                }
                setIsPreviewMode(false)
                setPreviewData(null)
            }
        } catch (err) {
            console.error('Failed to check user locks:', err)
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Fetch pericopes when book, search, or user filter changes
    useEffect(() => {
        fetchPericopes()
    }, [selectedBook, searchTerm, filterByUser])

    useEffect(() => {
        fetchContributors()
    }, [])

    const fetchBooks = async () => {
        try {
            const bookList = await pericopesAPI.getBooks()
            setBooks(bookList)
        } catch (err) {
            console.error('Failed to fetch books:', err)
        }
    }

    const fetchContributors = async () => {
        try {
            const list = await pericopesAPI.getContributors()
            setContributors(list)
        } catch (err) {
            console.error('Failed to fetch contributors:', err)
        }
    }

    const fetchPericopes = async () => {
        try {
            const params: { book?: string; search?: string; limit?: number; created_by_user_id?: string } = { limit: 50 }
            if (selectedBook) params.book = selectedBook
            if (searchTerm) params.search = searchTerm
            if (filterByUser === 'mine' && user?.id) params.created_by_user_id = user.id
            else if (filterByUser && filterByUser !== 'mine') params.created_by_user_id = filterByUser
            const pericopeList = await pericopesAPI.list(params)
            setPericopes(pericopeList)
        } catch (err) {
            console.error('Failed to fetch pericopes:', err)
        }
    }

    const handleSelectPericope = (pericope: Pericope) => {
        // Check if locked by another user
        if (pericope.lock && pericope.lock.userId !== user?.id) {
            toast.error('Pericope Locked', {
                description: `This pericope is being analyzed by ${pericope.lock.userName}`
            })
            return
        }

        // Check if has partial verse indicators - warn but allow
        if (hasPartialVerseIndicator(pericope.reference)) {
            const cleanRef = stripPartialVerseIndicators(pericope.reference)
            toast.warning('Partial Verse Reference', {
                description: `This pericope uses partial verses. BHSA will load full verses: "${cleanRef}"`,
                duration: 5000
            })
        }

        setSelectedPericope(pericope)
        setReference(pericope.reference)
        setSearchTerm(pericope.reference)
        setShowDropdown(false)
    }

    // Check for duplicates as user types
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

    const fetchExistingPassages = async () => {
        try {
            const passages = await passagesAPI.list()
            setExistingPassages(passages || [])
        } catch (err) {
            console.error('Failed to fetch existing passages:', err)
        }
    }

    const autoLoadBHSA = async () => {
        try {
            // Silently check if already loaded (don't show loading UI yet)
            const status = await bhsaAPI.getStatus()
            if (status.bhsa_loaded) {
                setBhsaLoaded(true)
                return
            }

            // Not loaded - now show loading UI and start loading
            setLoading(true)
            setLoadingMessage('Loading Text-Fabric data (ETCBC/bhsa)...')

            const response = await bhsaAPI.loadBHSA()

            if (response.status === 'already_loaded') {
                setBhsaLoaded(true)
                setLoading(false)
                setLoadingMessage('')
                return
            }

            // Poll for completion
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
    }

    // Fetch passage in preview mode (no locking yet)
    const handleFetchPassage = async () => {
        if (!reference.trim()) return

        // Strip partial verse indicators if present (e.g., "Ruth 1:8-19a" -> "Ruth 1:8-19")
        const cleanReference = stripPartialVerseIndicators(reference)
        const hadPartialVerse = cleanReference !== reference

        if (hadPartialVerse) {
            toast.warning('Using Full Verses', {
                description: `Partial verse reference adjusted to: "${cleanReference}"`,
                duration: 4000
            })
        }

        try {
            clearPassage() // Clear any existing data
            setPreviewData(null)
            setIsPreviewMode(false)
            setLoading(true)
            setLoadingMessage('Fetching passage preview from BHSA...')
            setError(null)

            // Fetch the passage data for preview only (skip translation)
            const data = await bhsaAPI.fetchPassage(cleanReference, true)

            if (data.clauses && data.clauses.length > 0) {
                const mainlineCount = data.clauses.filter((c: any) => c.is_mainline).length
                const backgroundCount = data.clauses.filter((c: any) => !c.is_mainline).length

                // Store preview info
                setPreviewData({
                    reference: data.reference,
                    clauseCount: data.clauses.length,
                    mainline: mainlineCount,
                    background: backgroundCount
                })
                setIsPreviewMode(true)
                setLoadingMessage('')

                // Store full data in a temp ref for when user confirms
                // We'll refetch on start to ensure fresh data
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
    }

    // Start analysis - lock the pericope and show full data
    const handleStartAnalysis = async () => {
        if (!reference.trim() || !previewData) return

        // Use the clean reference (without partial verse indicators)
        const cleanReference = stripPartialVerseIndicators(reference)

        try {
            // Release any existing lock first
            if (currentLock && currentLock !== cleanReference) {
                await releaseLock(currentLock)
            }

            // Try to acquire lock for this pericope (use clean reference)
            const lockAcquired = await acquireLock(cleanReference)
            if (!lockAcquired) {
                return // Lock failed, user was notified
            }

            setLoading(true)
            setLoadingMessage('Starting analysis...')
            setError(null)

            // Fetch full passage data now that we have the lock
            const data = await bhsaAPI.fetchPassage(cleanReference)

            if (data.id || data.passage_id) {
                setPassageData({
                    id: data.id || data.passage_id,
                    reference: data.reference,
                    source_lang: data.source_lang || 'Hebrew',
                    clauses: data.clauses,
                    display_units: data.display_units
                })
                setCheckedClauses(new Set()) // Reset checks for new passage
                setIsPreviewMode(false)
                setPreviewData(null)
                setLoadingMessage('')
            } else {
                // Fallback: if somehow ID is missing, try to create
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
    }

    // Cancel preview and go back to selection
    const handleCancelPreview = () => {
        setPreviewData(null)
        setIsPreviewMode(false)
        setSelectedPericope(null)
        setReference('')
        setSearchTerm('')
    }

    // Note: Auto-translation is handled by the backend during passage fetch
    // No need for frontend auto-translate - it causes duplicate API calls

    const allClausesChecked = passageData?.clauses ? passageData.clauses.every((c: any) => checkedClauses.has(c.clause_id?.toString() || c.id?.toString())) : false

    const mainlineClauses = passageData?.clauses?.filter(c => c.is_mainline) || []

    const backgroundClauses = passageData?.clauses?.filter(c => !c.is_mainline) || []

    // Display units: AI may merge adjacent clauses for readability. One row per unit; show "AI merged" when merged.
    const clauseById = useMemo(() => {
        const map: Record<number, any> = {}
        passageData?.clauses?.forEach((c: any) => { map[c.clause_id] = c })
        return map
    }, [passageData?.clauses])
    const displayUnits = useMemo(() => {
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
    const mergedUnitsCount = displayUnits.filter((u: any) => u.merged && u.clause_ids?.length > 1).length

    return (
        <div className="space-y-6">
            {/* Stage header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-preto flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-telha" />
                        Stage 1: Syntax
                    </h2>
                    <p className="text-verde mt-1">Load clause data and review mainline/background status.</p>
                </div>

                {/* BHSA Status - auto-loading on page load */}
                {bhsaLoaded ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-verde-claro/10 text-verde-claro border border-verde-claro/20">
                        <CheckCircle2 className="w-4 h-4" />
                        BHSA Ready
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-areia/50 text-verde border border-areia">
                        <Loader2 className="w-4 h-4 animate-spin text-telha" />
                        Loading BHSA...
                    </div>
                )}
            </div>

            {/* View-only banner when opened from My Meaning Maps */}
            {readOnly && (
                <div className="bg-azul/10 border border-azul/30 text-verde px-4 py-2 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-azul" />
                    <span className="font-medium">View only</span> — You can browse all stages but cannot edit this map.
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-in">
                    {error}
                </div>
            )}

            {/* Loading message */}
            {loadingMessage && (
                <div className="bg-azul/10 border border-azul/30 text-verde px-4 py-3 rounded-lg flex items-center gap-2 animate-in">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingMessage}
                </div>
            )}

            {/* Passage search (hidden in view-only mode) */}
            {!readOnly && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Select a Pericope</CardTitle>
                    <CardDescription>
                        Search and select from the available Old Testament pericopes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 items-start flex-wrap">
                        {/* Book filter */}
                        <div className="w-48">
                            <label className="text-xs text-verde/60 mb-1 block">Filter by Book</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                                <select
                                    value={selectedBook}
                                    onChange={(e) => setSelectedBook(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2 border border-areia-escuro/20 rounded-md bg-white text-preto text-sm focus:outline-none focus:ring-2 focus:ring-telha/20 focus:border-telha appearance-none cursor-pointer"
                                >
                                    <option value="">All Books</option>
                                    {books.map((book) => (
                                        <option key={book} value={book}>{book}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50 pointer-events-none" />
                            </div>
                        </div>

                        {/* Show pericopes by user (view only) */}
                        <div className="w-48">
                            <label className="text-xs text-verde/60 mb-1 block">Show pericopes by</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                                <select
                                    value={filterByUser}
                                    onChange={(e) => setFilterByUser(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2 border border-areia-escuro/20 rounded-md bg-white text-preto text-sm focus:outline-none focus:ring-2 focus:ring-telha/20 focus:border-telha appearance-none cursor-pointer"
                                >
                                    <option value="">All users</option>
                                    <option value="mine">Mine only</option>
                                    {contributors.map((c) => (
                                        <option key={c.id} value={c.id}>{c.username}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50 pointer-events-none" />
                            </div>
                        </div>

                        {/* Pericope search dropdown */}
                        <div className="flex-1 relative" ref={dropdownRef}>
                            <label className="text-xs text-verde/60 mb-1 block">Pericope Reference</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setSelectedPericope(null)
                                        setReference('')
                                        setShowDropdown(true)
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="Search pericopes (e.g. Genesis 1, Ruth 1:1)..."
                                    className="pl-10"
                                />
                            </div>

                            {/* Dropdown */}
                            {showDropdown && pericopes.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-areia-escuro/20 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    {pericopes.map((pericope) => {
                                        const isLockedByOther = !!(pericope.lock && pericope.lock.userId !== user?.id)
                                        const isLockedByMe = !!(pericope.lock && pericope.lock.userId === user?.id)
                                        const hasPartialVerse = hasPartialVerseIndicator(pericope.reference)
                                        const isDisabled = isLockedByOther // Only locked items are disabled, not partial verses

                                        return (
                                            <button
                                                key={pericope.id}
                                                onClick={() => handleSelectPericope(pericope)}
                                                disabled={isDisabled}
                                                className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-2 
                                                    ${isDisabled
                                                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                        : selectedPericope?.id === pericope.id
                                                            ? 'bg-telha/10 text-telha'
                                                            : 'text-preto hover:bg-areia/30'
                                                    }
                                                    ${isLockedByMe ? 'bg-verde-claro/10 border-l-2 border-verde-claro' : ''}
                                                    ${hasPartialVerse && !isDisabled ? 'border-l-2 border-amber-400' : ''}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">
                                                        {pericope.reference}
                                                    </span>
                                                    {hasPartialVerse && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Full verses
                                                        </span>
                                                    )}
                                                    {isLockedByOther && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            <Lock className="w-3 h-3" />
                                                            {pericope.lock?.userName}
                                                        </span>
                                                    )}
                                                    {isLockedByMe && (
                                                        <span className="flex items-center gap-1 text-xs text-verde-claro bg-verde-claro/10 px-2 py-0.5 rounded-full">
                                                            <User className="w-3 h-3" />
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-verde/50">{pericope.book}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* No results */}
                            {showDropdown && pericopes.length === 0 && searchTerm && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-areia-escuro/20 rounded-lg shadow-lg p-4 text-center text-verde/60 text-sm">
                                    No pericopes found matching "{searchTerm}"
                                </div>
                            )}
                        </div>

                        {/* Fetch button */}
                        <div className="pt-5">
                            <Button
                                onClick={handleFetchPassage}
                                disabled={loading || !bhsaLoaded || !selectedPericope}
                                title={!selectedPericope ? 'Please select a pericope from the list' : ''}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Passage'}
                            </Button>
                        </div>
                    </div>

                    {/* Selected pericope indicator */}
                    {selectedPericope && (
                        <div className="mt-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-verde-claro" />
                            <span className="text-sm text-verde">
                                Selected: <strong className="text-telha">{selectedPericope.reference}</strong>
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
            )}

            {/* Warning for duplicates */}
            {duplicateWarning && !passageData && !isPreviewMode && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4" />
                    {duplicateWarning}
                </div>
            )}

            {/* Preview Mode - Skeleton with Start Button */}
            {isPreviewMode && previewData && !passageData && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 border-2 border-dashed border-telha/30 bg-gradient-to-br from-areia/30 to-white">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-telha/10 flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-telha" />
                        </div>
                        <CardTitle className="text-2xl text-telha">{previewData.reference}</CardTitle>
                        <CardDescription className="text-verde text-base mt-2">
                            Preview loaded. Ready to start analysis?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Skeleton stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-white rounded-lg border border-areia-escuro/10 shadow-sm">
                                <div className="text-3xl font-bold text-preto">{previewData.clauseCount}</div>
                                <div className="text-sm text-verde/60">Total Clauses</div>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200/50 shadow-sm">
                                <div className="text-3xl font-bold text-amber-700">{previewData.mainline}</div>
                                <div className="text-sm text-amber-600/80">Mainline</div>
                            </div>
                            <div className="text-center p-4 bg-verde-claro/10 rounded-lg border border-verde-claro/20 shadow-sm">
                                <div className="text-3xl font-bold text-verde-claro">{previewData.background}</div>
                                <div className="text-sm text-verde-claro/80">Background</div>
                            </div>
                        </div>

                        {/* Skeleton clause preview */}
                        <div className="space-y-2 mb-6">
                            {[...Array(Math.min(3, previewData.clauseCount))].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="w-8 h-8 rounded bg-gray-200 animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                                    </div>
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                                </div>
                            ))}
                            {previewData.clauseCount > 3 && (
                                <div className="text-center text-sm text-verde/50 py-2">
                                    + {previewData.clauseCount - 3} more clauses
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={handleCancelPreview}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleStartAnalysis}
                                disabled={loading}
                                className="px-8 gap-2 bg-telha hover:bg-telha/90"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                Start Analysis
                            </Button>
                        </div>

                        <p className="text-center text-xs text-verde/50 mt-4">
                            Starting will lock this pericope for your exclusive use
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Existing Passages List */}
            {existingPassages.length > 0 && !passageData && !isPreviewMode && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-telha" />
                            Existing Meaning Maps
                        </CardTitle>
                        <CardDescription>
                            Passages that have already been analyzed. Click to load.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {existingPassages.map((passage) => (
                                <div
                                    key={passage.id}
                                    onClick={() => setReference(passage.reference)}
                                    className="flex items-center justify-between p-3 rounded-lg border border-areia-escuro/20 hover:border-telha/50 hover:bg-areia/20 cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${passage.isComplete ? 'bg-verde/10 text-verde' : 'bg-telha/10 text-telha'}`}>
                                            {passage.isComplete ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-preto group-hover:text-telha transition-colors">
                                                {passage.reference}
                                            </p>
                                            <p className="text-xs text-verde/60">
                                                {new Date(passage.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {passage.isComplete && (
                                        <Badge variant="success" className="bg-white/50">Complete</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Passage data display */}
            {passageData && (
                <Card className="animate-in">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl text-telha">{passageData.reference}</CardTitle>
                            <CardDescription>
                                Total Clauses: {passageData.clauses?.length || 0}
                                {displayUnits.length !== (passageData.clauses?.length || 0) && (
                                    <> • Display rows: {displayUnits.length}</>
                                )}
                                {' • '}
                                Mainline: {mainlineClauses.length} •
                                Background: {backgroundClauses.length}
                            </CardDescription>
                            <p className="text-xs text-verde/50 mt-1">
                                Clauses come from BHSA (ETCBC). Some are single-word (e.g. short imperatives)—that is expected.
                            </p>
                            {mergedUnitsCount > 0 && (
                                <p className="text-xs text-telha/80 mt-1 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    AI merged {mergedUnitsCount} group{mergedUnitsCount !== 1 ? 's' : ''} of adjacent clauses for readability. Merged rows are marked below.
                                </p>
                            )}
                        </div>
                        {!readOnly && (
                        <div className="flex gap-2">
                            <Button
                                onClick={async () => {
                                    if (!passageData?.reference || loading) return
                                    const cleanRef = stripPartialVerseIndicators(passageData.reference)
                                    setLoading(true)
                                    setLoadingMessage('Regenerating clause grouping...')
                                    try {
                                        const data = await bhsaAPI.fetchPassage(cleanRef, false, true)
                                        setPassageData({ ...passageData, clauses: data.clauses, display_units: data.display_units })
                                        toast.success('Clause grouping updated')
                                        // Re-analyze events so they match the new grouping (group before & after)
                                        setLoadingMessage('Re-analyzing events to match new grouping...')
                                        try {
                                            const phase2 = await bhsaAPI.aiPhase2(cleanRef, '')
                                            if (phase2?.data?.events) {
                                                setEvents(phase2.data.events)
                                                toast.success('Events updated to match new grouping')
                                            }
                                        } catch (phase2Err: any) {
                                            toast.warning('Grouping updated; re-run AI Analyze to refresh events')
                                        }
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.detail || 'Failed to refetch grouping')
                                    } finally {
                                        setLoading(false)
                                        setLoadingMessage('')
                                    }
                                }}
                                variant="outline"
                                className="gap-2"
                                disabled={loading || !passageData?.reference}
                                title="Re-run AI to regenerate clause grouping (stored grouping will be replaced)"
                            >
                                <Sparkles className="w-4 h-4" />
                                Refetch grouping
                            </Button>
                            <Button
                                onClick={() => setShowDiscardConfirm(true)}
                                variant="outline"
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Discard current session and start fresh"
                            >
                                <Trash2 className="w-4 h-4" />
                                Discard Session
                            </Button>
                            {isAdmin && (
                                <Button
                                    onClick={() => {
                                        if (passageData?.clauses) {
                                            const allIds = new Set(passageData.clauses.map((c: any) => c.clause_id?.toString() || c.id?.toString()))
                                            setCheckedClauses(allIds)
                                        }
                                    }}
                                    variant="outline"
                                    className="gap-2"
                                    disabled={!passageData?.clauses?.length}
                                >
                                    <Check className="w-4 h-4" />
                                    Validate All
                                </Button>
                            )}
                            <Button
                                onClick={() => setShowAIModal(true)}
                                variant="default"
                                className="gap-2"
                                disabled={!bhsaLoaded || !allClausesChecked}
                                title={!allClausesChecked ? "Please read and check all clauses first" : "Run AI Analysis"}
                            >
                                <Sparkles className="w-4 h-4" />
                                AI Analyze
                            </Button>
                        </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {displayUnits.map((unit: any) => {
                                const ids = unit.clause_ids ?? []
                                const clausesInUnit = ids.map((id: number) => clauseById[id]).filter(Boolean)
                                const isMerged = unit.merged && clausesInUnit.length > 1
                                const isMainline = clausesInUnit.some((c: any) => c.is_mainline)
                                const unitKey = ids.join('-')
                                const unitClauseIdStrs = ids.map((id: number) => String(id))
                                const isUnitChecked = unitClauseIdStrs.length > 0 && unitClauseIdStrs.every((id: string) => checkedClauses.has(id))
                                const handleUnitCheck = () => {
                                    if (isUnitChecked) unitClauseIdStrs.forEach((id: string) => { if (checkedClauses.has(id)) toggleClauseCheck(id) })
                                    else unitClauseIdStrs.forEach((id: string) => { if (!checkedClauses.has(id)) toggleClauseCheck(id) })
                                }
                                const combinedText = clausesInUnit.map((c: any) => c.text).filter(Boolean).join(' ')
                                const combinedGloss = clausesInUnit.map((c: any) => c.gloss).filter(Boolean).join(' ')
                                const combinedTranslation = clausesInUnit.map((c: any) => c.freeTranslation).filter(Boolean).join(' ')
                                const verseLabel = clausesInUnit.length === 1 ? `v${clausesInUnit[0].verse}` : `v${Math.min(...clausesInUnit.map((c: any) => c.verse))}–${Math.max(...clausesInUnit.map((c: any) => c.verse))}`
                                return (
                                    <div
                                        key={unitKey}
                                        className={`clause-card ${isMainline ? 'clause-card-mainline' : 'clause-card-background'}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {!readOnly && (
                                            <div className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-verde/30 text-telha focus:ring-telha cursor-pointer"
                                                    checked={isUnitChecked}
                                                    onChange={handleUnitCheck}
                                                />
                                            </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="text-xs font-medium text-verde/50">
                                                        {clausesInUnit.length === 1 ? `Clause ${ids[0]} (${verseLabel})` : `Clauses ${ids[0]}–${ids[ids.length - 1]} (${verseLabel})`}
                                                    </span>
                                                    <Badge variant={isMainline ? 'warning' : 'success'}>
                                                        {isMainline ? 'Mainline' : 'Background'}
                                                    </Badge>
                                                    {isMerged && (
                                                        <Badge variant="outline" className="text-telha border-telha/40 bg-telha/5 text-xs" title="AI merged these adjacent clauses for readability">
                                                            AI merged
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-preto text-sm mb-2">{combinedGloss || '—'}</p>
                                                {combinedTranslation && (
                                                    <p className="text-telha text-sm mb-2 italic border-l-2 border-telha/20 pl-2">
                                                        "{combinedTranslation}"
                                                    </p>
                                                )}
                                                {clausesInUnit.length === 1 && (clausesInUnit[0].lemma_ascii || clausesInUnit[0].lemma) && (
                                                    <p className="text-verde text-xs">
                                                        <strong>Verb:</strong> {clausesInUnit[0].lemma_ascii || clausesInUnit[0].lemma} ({clausesInUnit[0].binyan || 'qal'}) - {clausesInUnit[0].tense || 'perf'}
                                                    </p>
                                                )}
                                                {clausesInUnit.length > 1 && (
                                                    <p className="text-verde text-xs">
                                                        {clausesInUnit.map((c: any) => c.lemma_ascii || c.lemma).filter(Boolean).join(' · ') || '—'}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="hebrew-text text-lg text-preto/80 font-serif min-w-[200px] text-right">
                                                {combinedText || '—'}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Placeholder when no data */}
            {!passageData && !isPreviewMode && bhsaLoaded && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-verde/60">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Enter a passage reference above to begin analysis.</p>
                    </CardContent>
                </Card>
            )}

            {/* AI Modal */}
            <AIProcessingModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
            />

            {/* Discard Session Confirmation Dialog */}
            <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Discard Session
                        </DialogTitle>
                        <DialogDescription>
                            This will clear your current work session and return you to the passage selection.
                            <br /><br />
                            <strong>Note:</strong> Data already saved to the database will not be deleted.
                            You can reload the same passage to continue working on it.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowDiscardConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                // Release lock if held
                                if (currentLock) {
                                    releaseLock()
                                }
                                // Discard session (clears state and localStorage, including checkedClauses)
                                discardSession()
                                setShowDiscardConfirm(false)
                                setReference('')
                                toast.success('Session discarded', {
                                    description: 'You can now start a new analysis'
                                })
                            }}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Discard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Stage1Syntax
