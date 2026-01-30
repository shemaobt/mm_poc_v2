import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { CheckCircle2, Check } from 'lucide-react'
import { ValidationSummaryProps } from './types'

export function ValidationSummary({
    validatedCount,
    totalCount,
    allValidated,
    readOnly,
    isAdmin,
    onValidateAll
}: ValidationSummaryProps) {
    return (
        <div className="flex items-center justify-between bg-areia/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${allValidated ? 'text-verde-claro' : 'text-areia'}`} />
                <span className="text-sm text-preto">
                    <span className="font-semibold">{validatedCount}</span> of <span className="font-semibold">{totalCount}</span> participants validated
                </span>
                {allValidated && <Badge variant="success" className="ml-2">✓ All Reviewed</Badge>}
            </div>
            {!readOnly && isAdmin && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onValidateAll}
                    disabled={allValidated}
                >
                    <Check className="w-4 h-4 mr-1" />
                    Validate All
                </Button>
            )}
        </div>
    )
}
