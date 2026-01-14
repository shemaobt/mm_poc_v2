import { useState } from 'react'
import { bhsaAPI, metricsAPI } from '../../services/api'
import { usePassageStore } from '../../stores/passageStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Sparkles, CheckCircle2, Loader2, Brain, Users, GitBranch, Zap, MessageSquare } from 'lucide-react'

interface AIProcessingModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AIProcessingModal({ isOpen, onClose }: AIProcessingModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')
    const [currentStep, setCurrentStep] = useState(0)

    const { passageData, setParticipants, setRelations, setEvents, setDiscourse, setAiSnapshot } = usePassageStore()

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

        try {
            // STEP 0: Analysis Started
            setCurrentStep(0)

            // STEP 1: Phase 1 (Participants & Relations)
            setCurrentStep(1)
            const phase1Resp = await bhsaAPI.aiPhase1(passageData.reference, '')
            const phase1Data = phase1Resp.data

            // Update store incrementally
            if (phase1Data.participants) setParticipants(phase1Data.participants)
            if (phase1Data.relations) setRelations(phase1Data.relations)

            // STEP 2: Identifying/Mapping Relations (Visual Step, quick transition)
            setCurrentStep(2)
            await new Promise(r => setTimeout(r, 500))

            // STEP 3: Phase 2 (Events & Discourse) - This uses Context from Phase 1
            setCurrentStep(3)
            const phase2Resp = await bhsaAPI.aiPhase2(passageData.reference, '')
            const phase2Data = phase2Resp.data

            // Update store with events/discourse
            if (phase2Data.events) setEvents(phase2Data.events)
            if (phase2Data.discourse) setDiscourse(phase2Data.discourse)

            // STEP 4: Finalizing
            setCurrentStep(4)

            // Create snapshot for metrics tracking (Combined data)
            const combinedData = { ...phase1Data, ...phase2Data }

            try {
                if (passageData?.id) {
                    console.log('Sending snapshot data for passage:', passageData.id)
                    const snapshotResponse = await metricsAPI.createSnapshot(passageData.id, combinedData)
                    setAiSnapshot(combinedData, snapshotResponse.snapshotId)
                }
            } catch (snapErr: any) {
                console.warn('Failed to create AI snapshot:', snapErr)
            }

            setStatus('success')
            setTimeout(() => {
                onClose()
                setStatus('idle')
                setCurrentStep(0)
            }, 1500)

        } catch (err: any) {
            console.error('AI Analysis failed:', err)
            setError(err.response?.data?.detail || 'AI Analysis failed. Please try again.')
            setStatus('idle')
            setCurrentStep(0)
        } finally {
            setLoading(false)
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
                        <p className="text-verde mt-1">Populating all stages...</p>
                    </div>
                ) : status === 'processing' ? (
                    <div className="py-6">
                        <div className="space-y-3">
                            {steps.map((step, i) => {
                                const Icon = step.icon
                                const isActive = i === currentStep
                                const isComplete = i < currentStep

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
                                        <span className={`text-sm font-medium ${isActive ? 'text-telha' :
                                            isComplete ? 'text-verde-claro' : 'text-verde/50'
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
