import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { KeyTermsSectionProps } from './types'
import { SEMANTIC_DOMAINS, CONSISTENCY_OPTIONS } from '../../../constants/tripod'

export function KeyTermsSection({
    keyTerms,
    onAddKeyTerm,
    onUpdateKeyTerm,
    onRemoveKeyTerm
}: KeyTermsSectionProps) {
    return (
        <CollapsibleSection title="Key Terms" emoji="🔑" count={keyTerms?.length} variant="key-terms">
            <div className="space-y-3">
                {(keyTerms || []).map((term, i) => (
                    <div key={i} className="p-3 bg-areia/10 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Term {i + 1}</span>
                            <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onRemoveKeyTerm(i)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-preto mb-1.5 block">Source Lemma</label>
                                <Input
                                    value={term.sourceLemma}
                                    onChange={(e) => onUpdateKeyTerm(i, 'sourceLemma', e.target.value)}
                                    placeholder="Hebrew/Greek lemma"
                                />
                            </div>
                            <SelectField
                                label="Semantic Domain"
                                value={term.semanticDomain}
                                options={SEMANTIC_DOMAINS}
                                onChange={(v) => onUpdateKeyTerm(i, 'semanticDomain', v)}
                                category="semantic_domain"
                            />
                            <SelectField
                                label="Consistency"
                                value={term.consistency}
                                options={CONSISTENCY_OPTIONS}
                                onChange={(v) => onUpdateKeyTerm(i, 'consistency', v)}
                                category="consistency"
                            />
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={onAddKeyTerm}>
                    <Plus className="w-4 h-4 mr-1" /> Add Key Term
                </Button>
            </div>
        </CollapsibleSection>
    )
}
