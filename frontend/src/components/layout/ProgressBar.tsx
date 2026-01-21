import { Check, Sparkles } from 'lucide-react'
import { Progress } from '../ui/progress'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
    currentStage: number
    totalStages: number
    stageLabels?: string[]
    onStageClick?: (stage: number) => void
}

const defaultLabels = ['Syntax', 'Participants', 'Relations', 'Events', 'Discourse']

function ProgressBar({ currentStage, totalStages, stageLabels = defaultLabels, onStageClick }: ProgressBarProps) {
    const progressPercent = ((currentStage - 1) / (totalStages - 1)) * 100

    const handleStageClick = (stage: number) => {
        if (onStageClick && stage !== currentStage) {
            onStageClick(stage)
        }
    }

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

                    {/* Step indicators - now clickable */}
                    <div className="flex items-center justify-between">
                        {stageLabels.map((label, index) => {
                            const stepNumber = index + 1
                            const isCompleted = stepNumber < currentStage
                            const isActive = stepNumber === currentStage
                            const isPending = stepNumber > currentStage
                            const isClickable = onStageClick && stepNumber !== currentStage

                            return (
                                <button
                                    key={stepNumber}
                                    type="button"
                                    onClick={() => handleStageClick(stepNumber)}
                                    disabled={!isClickable}
                                    className={cn(
                                        "flex flex-col items-center gap-2 flex-1 transition-all",
                                        isClickable && "cursor-pointer hover:scale-105",
                                        !isClickable && "cursor-default"
                                    )}
                                >
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
                                            "step-indicator transition-transform",
                                            isCompleted && "step-indicator-completed",
                                            isActive && "step-indicator-active animate-bounce-subtle",
                                            isPending && "step-indicator-pending",
                                            isClickable && "hover:ring-2 hover:ring-telha/30"
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
                                            isPending && "text-verde/50",
                                            isClickable && "hover:text-telha"
                                        )}
                                    >
                                        {label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProgressBar
