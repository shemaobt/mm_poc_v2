import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Save, CheckCircle, Loader2 } from 'lucide-react'
import { stageHeaderStyles } from '@/styles'

interface FinalizeCardProps {
    saving: boolean
    saved: boolean
    onFinalize: () => void
}

export function FinalizeCard({ saving, saved, onFinalize }: FinalizeCardProps) {
    return (
        <Card className="border-2 border-verde-claro/30 bg-verde-claro/5">
            <CardContent className="py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-preto flex items-center gap-2">
                            {saved ? (
                                <>
                                    <CheckCircle className="w-5 h-5 text-verde-claro" />
                                    Analysis Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 text-verde-claro" />
                                    Complete Your Analysis
                                </>
                            )}
                        </h3>
                        <p className={stageHeaderStyles.description}>
                            {saved
                                ? 'Your meaning map has been saved to the database. View it in "My Saved Maps".'
                                : 'Save this analysis to the database. You can download it as JSON later from "My Saved Maps".'
                            }
                        </p>
                    </div>
                    <Button
                        onClick={onFinalize}
                        disabled={saving || saved}
                        variant={saved ? 'outline' : 'default'}
                        className="gap-2"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved' : 'Complete & Save'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
