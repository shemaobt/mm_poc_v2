import { useState, useRef } from 'react'
import { metricsAPI } from '../../services/api'
import { usePassageStore } from '../../stores/passageStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Sparkles, CheckCircle2, Loader2, Brain, Users, GitBranch, Zap, MessageSquare } from 'lucide-react'
import { errorStateStyles, stageHeaderStyles } from '@/styles'

interface AIProcessingModalProps {
    isOpen: boolean
    onClose: () => void
}

interface ProgressInfo {
    current: number
    total: number
    message?: string
}

interface StepProgress {
    [key: number]: ProgressInfo
}

export default function AIProcessingModal({ isOpen, onClose }: AIProcessingModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')
    const [currentStep, setCurrentStep] = useState(0)
    const [stepProgress, setStepProgress] = useState<StepProgress>({})
    const eventSourceRef = useRef<EventSource | null>(null)

    const { passageData, fetchEvents, fetchDiscourse, setAiSnapshot } = usePassageStore()

    const steps = [
        { icon: Brain, label: 'Analyzing text...' },
        { icon: Users, label: 'Extracting participants...' },
        { icon: GitBranch, label: 'Identifying relations...' },
        { icon: Zap, label: 'Mapping events...' },
        { icon: MessageSquare, label: 'Building discourse...' },
    ]

    const handleAnalyze = async () => {
        if (!passageData?.reference) return

        setLoading(true)
        setError(null)
        setStatus('processing')
        setStepProgress({})
        setCurrentStep(0)

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
            
            await new Promise<void>((resolve, reject) => {
                const encodedRef = encodeURIComponent(passageData.reference)
                const eventSource = new EventSource(
                    `${API_BASE}/api/ai/analyze/stream?passage_ref=${encodedRef}`
                )
                eventSourceRef.current = eventSource
                
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        console.log('[SSE] Progress:', data)
                        
                        if (data.step === 'error') {
                            eventSource.close()
                            reject(new Error(data.message))
                            return
                        }
                        
                        const phaseToStep: { [key: number]: number } = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 }
                        
                        if (data.phase !== undefined) {
                            setCurrentStep(phaseToStep[data.phase] ?? data.phase)
                        }
                        
                        if (data.step === 'participant') {
                            setStepProgress(prev => ({
                                ...prev,
                                1: { current: data.current, total: data.total, message: data.message }
                            }))
                        }
                        
                        if (data.step === 'relation') {
                            setStepProgress(prev => ({
                                ...prev,
                                2: { current: data.current, total: data.total, message: data.message }
                            }))
                        }
                        
                        if (data.step === 'event') {
                            setStepProgress(prev => ({
                                ...prev,
                                3: { current: data.current, total: data.total, message: data.message }
                            }))
                        }
                        
                        if (data.step === 'discourse') {
                            setStepProgress(prev => ({
                                ...prev,
                                4: { current: data.current, total: data.total, message: data.message }
                            }))
                        }
                        
                        if (data.step === 'ai_phase1_complete') {
                            setStepProgress(prev => ({
                                ...prev,
                                1: { current: 0, total: data.totalParticipants || 0, message: `Found ${data.totalParticipants} participants` },
                                2: { current: 0, total: data.totalRelations || 0, message: `Found ${data.totalRelations} relations` }
                            }))
                        }
                        
                        if (data.step === 'ai_phase2_complete') {
                            setStepProgress(prev => ({
                                ...prev,
                                3: { current: 0, total: data.totalEvents || 0, message: `Found ${data.totalEvents} events` },
                                4: { current: 0, total: data.totalDiscourse || 0, message: `Found ${data.totalDiscourse} discourse` }
                            }))
                        }
                        
                        if (data.step === 'complete') {
                            eventSource.close()
                            resolve()
                        }
                    } catch (e) {
                        console.error('[SSE] Parse error:', e)
                    }
                }
                
                eventSource.onerror = (err) => {
                    console.error('[SSE] Error:', err)
                    eventSource.close()
                    reject(new Error('Connection lost during analysis. Please check your internet connection.'))
                }
            })
            
            if (passageData?.id) {
                await fetchEvents(passageData.id)
                await fetchDiscourse(passageData.id)
                
                const { bhsaAPI } = await import('../../services/api')
                const participants = await bhsaAPI.getParticipants(passageData.id)
                const relations = await bhsaAPI.getRelations(passageData.id)
                
                try {
                    const snapshotResponse = await metricsAPI.createSnapshot(passageData.id, { participants, relations })
                    setAiSnapshot({ participants, relations }, snapshotResponse.snapshotId)
                } catch (snapErr) {
                    console.warn('Failed to create AI snapshot:', snapErr)
                }
            }

            setStatus('success')
            setTimeout(() => {
                onClose()
                setStatus('idle')
                setCurrentStep(0)
                setStepProgress({})
            }, 1500)

        } catch (err: any) {
            console.error('AI Analysis failed:', err)
            setError(err.message || 'AI Analysis failed. Please try again.')
            setStatus('idle')
            setCurrentStep(0)
            setStepProgress({})
        } finally {
            setLoading(false)
            eventSourceRef.current = null
        }
    }

    const handleClose = () => {
        if (!loading) {
            onClose()
            setStatus('idle')
            setCurrentStep(0)
            setError(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-telha" />
                        AI Semantic Analysis
                    </DialogTitle>
                    <DialogDescription>
                        Analyze "{passageData?.reference}" with Claude AI
                    </DialogDescription>
                </DialogHeader>

                {status === 'success' ? (
                    <div className="py-8 text-center animate-in">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-verde-claro/20 flex items-center justify-center animate-celebrate">
                            <CheckCircle2 className="w-8 h-8 text-verde-claro" />
                        </div>
                        <h4 className="text-lg font-semibold text-preto">Analysis Complete!</h4>
                        <p className={stageHeaderStyles.description}>Populating all stages...</p>
                    </div>
                ) : status === 'processing' ? (
                    <div className="py-6">
                        <div className="space-y-3">
                            {steps.map((step, i) => {
                                const Icon = step.icon
                                const isActive = i === currentStep
                                const isComplete = i < currentStep
                                const progress = stepProgress[i]
                                const showProgress = progress && progress.total > 0

                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive ? 'bg-telha/10 border border-telha/30' :
                                            isComplete ? 'bg-verde-claro/10' : 'bg-areia/20'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-telha text-white' :
                                            isComplete ? 'bg-verde-claro text-white' : 'bg-areia/50 text-verde'
                                            }`}>
                                            {isComplete ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : isActive ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${isActive ? 'text-telha' :
                                                    isComplete ? 'text-verde-claro' : 'text-verde/50'
                                                    }`}>
                                                    {step.label}
                                                </span>
                                                {showProgress && (
                                                    <span className={`text-xs font-mono ${isActive ? 'text-telha' : 'text-verde-claro'}`}>
                                                        {progress.current}/{progress.total}
                                                    </span>
                                                )}
                                            </div>
                                            {showProgress && (isActive || isComplete) && (
                                                <div className="mt-1.5">
                                                    <div className="h-1.5 bg-areia/30 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-200 ${isComplete ? 'bg-verde-claro' : 'bg-telha'}`}
                                                            style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className={errorStateStyles.banner}>
                                {error}
                            </div>
                        )}

                        <div className="py-4 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-telha/10 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-telha" />
                            </div>
                            <p className="text-verde text-sm">
                                Claude AI will analyze the passage and automatically populate participants, relations, events, and discourse structure.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
                                <Sparkles className="w-4 h-4" />
                                Start Analysis
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
