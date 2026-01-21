import { useState, useEffect, useRef, useCallback } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI, passagesAPI, pericopesAPI, Pericope } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import AIProcessingModal from '../common/AIProcessingModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { CheckCircle2, Search, Sparkles, BookOpen, Loader2, FileText, AlertTriangle, ChevronDown, Filter, Check, Lock, User } from 'lucide-react'
import { toast } from 'sonner'

interface ExistingPassage {
    id: string
    reference: string
    isComplete: boolean
    createdAt: string
}

/**
 * Check if a pericope reference contains partial verse indicators (a, b, c, etc.)
 * These are not supported by BHSA data.
 * Examples: "Ruth 1:19b-2:2", "Ruth 1:8-19a", "Genesis 1:1a"
 */
const hasPartialVerseIndicator = (reference: string): boolean => {
    // Pattern to detect verse numbers followed by a, b, c, etc.
    // Matches: :19a, :19b, :1a, :22c, etc. (also at end of string)
    const partialVersePattern = /:\d+[a-z]/i
    return partialVersePattern.test(reference)
}

function Stage1Syntax() {
    const { passageData, setPassageData, bhsaLoaded, setBhsaLoaded, loading, setLoading, error, setError, clearPassage } = usePassageStore()
    const [reference, setReference] = useState('')
    const [loadingMessage, setLoadingMessage] = useState('')
    const [showAIModal, setShowAIModal] = useState(false)
    const [existingPassages, setExistingPassages] = useState<ExistingPassage[]>([])
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
    const [translating, setTranslating] = useState(false)
    const [checkedClauses, setCheckedClauses] = useState<Set<string>>(new Set()) // Track checked clause IDs
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
                
                // Auto-fetch the passage data if not already loaded
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
                                clauses: data.clauses
                            })
                        }
                    } catch (err) {
                        console.error('Failed to restore session:', err)
                    } finally {
                        setLoading(false)
                        setLoadingMessage('')
                    }
                }
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

    // Fetch pericopes when book or search changes
    useEffect(() => {
        fetchPericopes()
    }, [selectedBook, searchTerm])

    const fetchBooks = async () => {
        try {
            const bookList = await pericopesAPI.getBooks()
            setBooks(bookList)
        } catch (err) {
            console.error('Failed to fetch books:', err)
        }
    }

    const fetchPericopes = async () => {
        try {
            const params: { book?: string; search?: string; limit?: number } = { limit: 50 }
            if (selectedBook) params.book = selectedBook
            if (searchTerm) params.search = searchTerm
            const pericopeList = await pericopesAPI.list(params)
            setPericopes(pericopeList)
        } catch (err) {
            console.error('Failed to fetch pericopes:', err)
        }
    }

    const handleSelectPericope = (pericope: Pericope) => {
        // Check if has partial verse indicators (not supported by BHSA)
        if (hasPartialVerseIndicator(pericope.reference)) {
            toast.error('Partial Verses Not Supported', {
                description: 'BHSA data does not support partial verse references (like 19a, 19b). Please choose a pericope with complete verses.'
            })
            return
        }
        
        // Check if locked by another user
        if (pericope.lock && pericope.lock.userId !== user?.id) {
            toast.error('Pericope Locked', {
                description: `This pericope is being analyzed by ${pericope.lock.userName}`
            })
            return
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
        
        // Check for partial verse indicators before fetching
        if (hasPartialVerseIndicator(reference)) {
            toast.error('Partial Verses Not Supported', {
                description: 'BHSA data does not support partial verse references (like 19a, 19b). Please choose a pericope with complete verses.'
            })
            return
        }

        try {
            clearPassage() // Clear any existing data
            setPreviewData(null)
            setIsPreviewMode(false)
            setLoading(true)
            setLoadingMessage('Fetching passage preview from BHSA...')
            setError(null)
            
            // Fetch the passage data for preview only
            const data = await bhsaAPI.fetchPassage(reference)

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

        try {
            // Release any existing lock first
            if (currentLock && currentLock !== reference) {
                await releaseLock(currentLock)
            }
            
            // Try to acquire lock for this pericope
            const lockAcquired = await acquireLock(reference)
            if (!lockAcquired) {
                return // Lock failed, user was notified
            }
            
            setLoading(true)
            setLoadingMessage('Starting analysis...')
            setError(null)
            
            // Fetch full passage data now that we have the lock
            const data = await bhsaAPI.fetchPassage(reference)

            if (data.id || data.passage_id) {
                setPassageData({
                    id: data.id || data.passage_id,
                    reference: data.reference,
                    source_lang: data.source_lang || 'Hebrew',
                    clauses: data.clauses
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
                        clauses: data.clauses
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

    // Auto-translate Logic
    useEffect(() => {
        if (!passageData || !passageData.clauses) return

        // Check if we need translations (if any clause is missing freeTranslation)
        const needsTranslation = passageData.clauses.some((c: any) => !c.freeTranslation)

        if (needsTranslation && !translating) {
            autoTranslate()
        }
    }, [passageData?.id]) // Run when passage ID changes (new passage loaded)

    const autoTranslate = async () => {
        if (!passageData?.reference) return

        try {
            setTranslating(true)
            // Use a default key or the one from env if feasible, but backend handles it mostly.
            // Actually api.ts translateClauses requires apiKey.
            // The AIProcessingModal uses bhsaAPI.aiPrefill which takes apiKey.
            // Ideally backend should handle key if not provided, but let's see.
            // The backend endpoint checks os.getenv("ANTHROPIC_API_KEY").
            // The frontend API method currently expects apiKey as 2nd arg.
            // WORKAROUND: Pass empty string if backend is configured to use env var
            // Wait, looking at api.ts: translateClauses: async (reference: string, apiKey: string)
            // In backend ai.py: api_key = os.getenv("ANTHROPIC_API_KEY") if not passed?
            // ai.py POST /translate_clauses:
            // api_key = os.getenv("ANTHROPIC_API_KEY") 
            // It ONLY looks at env var! It relies on backend env.
            // The request model has 'api_key' optional but the code doesn't use it from request?
            // Actually, my edit to ai.py:
            // api_key = os.getenv("ANTHROPIC_API_KEY") (lines added)
            // It ignores the request body api_key. So passing empty string is fine.

            const result = await bhsaAPI.translateClauses(passageData.reference, "")

            // Update local state with new translations
            if (result.translations) {
                setPassageData({
                    ...passageData,
                    clauses: passageData.clauses.map((c: any) => {
                        // Match by clauseIndex (assuming result keys are 1-based indices)
                        // This logic must match the backend logic or use ID if available.
                        // Backend loops and updates DB.
                        // Ideally we should reload the passage to get the definitive state
                        // OR update locally accurately.
                        // The backend returns { "1": "trans", "2": "trans" ... }
                        // where keys are strings of (clauseIndex + 1).
                        const key = (c.clauseIndex !== undefined ? c.clauseIndex + 1 : c.clause_id).toString()
                        if (result.translations[key]) {
                            return { ...c, freeTranslation: result.translations[key] }
                        }
                        return c
                    })
                })
            }
        } catch (err) {
            console.error("Auto-translation failed:", err)
        } finally {
            setTranslating(false)
        }
    }

    const toggleClauseCheck = (clauseId: string) => {
        const newSet = new Set(checkedClauses)
        if (newSet.has(clauseId)) {
            newSet.delete(clauseId)
        } else {
            newSet.add(clauseId)
        }
        setCheckedClauses(newSet)
    }

    const allClausesChecked = passageData?.clauses ? passageData.clauses.every((c: any) => checkedClauses.has(c.clause_id?.toString() || c.id?.toString())) : false

    const mainlineClauses = passageData?.clauses?.filter(c => c.is_mainline) || []

    const backgroundClauses = passageData?.clauses?.filter(c => !c.is_mainline) || []

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

            {/* Passage search */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Select a Pericope</CardTitle>
                    <CardDescription>
                        Search and select from the available Old Testament pericopes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 items-start">
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
                                        const isDisabled = isLockedByOther || hasPartialVerse
                                        
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
                                                    ${hasPartialVerse ? 'border-l-2 border-red-300' : ''}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-medium ${hasPartialVerse ? 'line-through opacity-60' : ''}`}>
                                                        {pericope.reference}
                                                    </span>
                                                    {hasPartialVerse && (
                                                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Partial verse
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
                                Total Clauses: {passageData.clauses?.length || 0} •
                                Mainline: {mainlineClauses.length} •
                                Background: {backgroundClauses.length}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
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
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {passageData.clauses?.map((clause: any) => (
                                <div
                                    key={clause.clause_id}
                                    className={`clause-card ${clause.is_mainline ? 'clause-card-mainline' : 'clause-card-background'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Checkbox for Read Check */}
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-verde/30 text-telha focus:ring-telha cursor-pointer"
                                                checked={checkedClauses.has(clause.clause_id?.toString() || clause.id?.toString())}
                                                onChange={() => toggleClauseCheck(clause.clause_id?.toString() || clause.id?.toString())}
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-verde/50">
                                                    Clause {clause.verse} (v{clause.verse})
                                                </span>
                                                <Badge variant={clause.is_mainline ? 'warning' : 'success'}>
                                                    {clause.is_mainline ? 'Mainline' : 'Background'}
                                                </Badge>
                                            </div>
                                            <p className="text-preto text-sm mb-2">{clause.gloss}</p>
                                            {/* Free Translation */}
                                            {clause.freeTranslation && (
                                                <p className="text-telha text-sm mb-2 italic border-l-2 border-telha/20 pl-2">
                                                    "{clause.freeTranslation}"
                                                </p>
                                            )}
                                            {!clause.freeTranslation && translating && (
                                                <div className="flex items-center gap-2 text-xs text-verde/50 mb-2 italic">
                                                    <Sparkles className="w-3 h-3 animate-pulse" />
                                                    Translating...
                                                </div>
                                            )}
                                            <p className="text-verde text-xs">
                                                <strong>Verb:</strong> {clause.lemma_ascii || clause.lemma} ({clause.binyan || 'qal'}) - {clause.tense || 'perf'}
                                            </p>
                                        </div>
                                        <div className="hebrew-text text-lg text-preto/80 font-serif min-w-[200px] text-right">
                                            {clause.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
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
        </div>
    )
}

export default Stage1Syntax
