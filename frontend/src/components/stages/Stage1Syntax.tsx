import { useState, useEffect } from 'react'
import { usePassageStore } from '../../stores/passageStore'
import { bhsaAPI, passagesAPI } from '../../services/api'
import AIProcessingModal from '../common/AIProcessingModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { CheckCircle2, Search, Sparkles, BookOpen, Loader2, FileText, AlertTriangle } from 'lucide-react'

interface ExistingPassage {
    id: string
    reference: string
    isComplete: boolean
    createdAt: string
}

function Stage1Syntax() {
    const { passageData, setPassageData, bhsaLoaded, setBhsaLoaded, loading, setLoading, error, setError } = usePassageStore()
    const [reference, setReference] = useState('')
    const [loadingMessage, setLoadingMessage] = useState('')
    const [showAIModal, setShowAIModal] = useState(false)
    const [existingPassages, setExistingPassages] = useState<ExistingPassage[]>([])
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

    useEffect(() => {
        // Always check backend status on mount to ensure synchronization
        // even if frontend thinks it is loaded (persistence might be stale if backend restarted)
        autoLoadBHSA()
        fetchExistingPassages()
    }, [])

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

    const handleFetchPassage = async () => {
        if (!reference.trim()) return

        try {
            setLoading(true)
            setError(null)
            const data = await bhsaAPI.fetchPassage(reference)

            // Persist passage to get a real ID (and ensure clauses are in DB)
            // We use the reference we just fetched
            try {
                // Ensure passagesAPI is imported (I will add import in next step if missing)
                // But wait, I can use the imported variable if I verify it.
                // Assuming passagesAPI is exported from api.ts (it is).
                const persisted = await passagesAPI.create({
                    reference: data.reference,
                    sourceLang: 'hbo'
                })

                setPassageData({
                    id: persisted.id, // Use the real database ID
                    reference: data.reference,
                    source_lang: data.source_lang || 'Hebrew',
                    clauses: data.clauses
                })
            } catch (persistErr) {
                console.error("Failed to persist passage:", persistErr)
                // Fallback: use data without ID? Or show error?
                // If we don't have ID, next stages will fail.
                setError("Failed to initialize passage session. Database error.")
            }

        } catch (err: any) {
            console.error('Failed to fetch passage:', err)
            setError(err.response?.data?.detail || 'Failed to fetch passage.')
        } finally {
            setLoading(false)
        }
    }

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
                    <CardTitle className="text-lg">Passage Reference</CardTitle>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="default">Ruth 1:1-6</Badge>
                        <Badge variant="default">Genesis 1:1-5</Badge>
                        <Badge variant="default">Exodus 3:1-10</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Enter passage reference..."
                                className="pl-10"
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchPassage()}
                            />
                        </div>
                        <Button onClick={handleFetchPassage} disabled={loading || !bhsaLoaded}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Passage'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Warning for duplicates */}
            {duplicateWarning && !passageData && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4" />
                    {duplicateWarning}
                </div>
            )}

            {/* Existing Passages List */}
            {existingPassages.length > 0 && !passageData && (
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
                        <Button onClick={() => setShowAIModal(true)} variant="default" className="gap-2" disabled={!bhsaLoaded}>
                            <Sparkles className="w-4 h-4" />
                            AI Analyze
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {passageData.clauses?.map((clause: any) => (
                                <div
                                    key={clause.clause_id}
                                    className={`clause-card ${clause.is_mainline ? 'clause-card-mainline' : 'clause-card-background'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
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
            {!passageData && bhsaLoaded && (
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
