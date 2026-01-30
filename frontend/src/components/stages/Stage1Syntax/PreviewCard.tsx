import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { BookOpen, Loader2, Sparkles } from 'lucide-react'
import { PreviewData } from './types'

interface PreviewCardProps {
    previewData: PreviewData
    loading: boolean
    onCancel: () => void
    onStartAnalysis: () => void
}

export function PreviewCard({ previewData, loading, onCancel, onStartAnalysis }: PreviewCardProps) {
    return (
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

                <div className="flex gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="px-6"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onStartAnalysis}
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
    )
}
