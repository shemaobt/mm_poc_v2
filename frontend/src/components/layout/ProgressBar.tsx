import { Check, Sparkles } from 'lucide-react'
import { Progress } from '../ui/progress'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
    currentStage: number
    totalStages: number
    stageLabels?: string[]
}

const defaultLabels = ['Syntax', 'Participants', 'Relations', 'Events', 'Discourse']

function ProgressBar({ currentStage, totalStages, stageLabels = defaultLabels }: ProgressBarProps) {
    const progressPercent = ((currentStage - 1) / (totalStages - 1)) * 100

    return (
        <div className="py-6 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-areia/30 px-8 py-6">
                    {/* XP-style progress bar */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-telha" />
                            <span className="font-semibold text-preto">Progress</span>
                        </div>
                        <div className="flex-1">
                            <Progress value={progressPercent} className="h-2" />
                        </div>
                        <span className="text-sm font-medium text-verde">
                            {currentStage}/{totalStages}
                        </span>
                    </div>

                    {/* Step indicators */}
                    <div className="flex items-center justify-between">
                        {stageLabels.map((label, index) => {
                            const stepNumber = index + 1
                            const isCompleted = stepNumber < currentStage
                            const isActive = stepNumber === currentStage
                            const isPending = stepNumber > currentStage

                            return (
                                <div key={stepNumber} className="flex flex-col items-center gap-2 flex-1">
                                    {/* Connector line (except for first) */}
                                    {index > 0 && (
                                        <div
                                            className={cn(
                                                "absolute h-0.5 w-full -translate-y-5 -left-1/2",
                                                isCompleted || isActive ? "bg-verde-claro" : "bg-areia/50"
                                            )}
                                            style={{ display: 'none' }}
                                        />
                                    )}

                                    {/* Step circle */}
                                    <div
                                        className={cn(
                                            "step-indicator",
                                            isCompleted && "step-indicator-completed",
                                            isActive && "step-indicator-active animate-bounce-subtle",
                                            isPending && "step-indicator-pending"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            stepNumber
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span
                                        className={cn(
                                            "text-xs font-medium transition-colors",
                                            isActive && "text-telha",
                                            isCompleted && "text-verde-claro",
                                            isPending && "text-verde/50"
                                        )}
                                    >
                                        {label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProgressBar
