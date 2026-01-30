import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { CheckCircle2, BookOpen, FileText } from 'lucide-react'
import { ExistingPassage } from './types'

interface ExistingPassagesCardProps {
    passages: ExistingPassage[]
    onSelectReference: (reference: string) => void
}

export function ExistingPassagesCard({ passages, onSelectReference }: ExistingPassagesCardProps) {
    return (
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
                    {passages.map((passage) => (
                        <div
                            key={passage.id}
                            onClick={() => onSelectReference(passage.reference)}
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
    )
}
