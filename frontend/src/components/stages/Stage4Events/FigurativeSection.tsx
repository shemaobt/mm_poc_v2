import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { FigurativeSectionProps } from './types'
import { FIGURE_TYPES, TRANSFERABILITY } from '../../../constants/tripod'

export function FigurativeSection({ figurative, onChange }: FigurativeSectionProps) {
    return (
        <CollapsibleSection title="Figurative" emoji="🎭" variant="figurative">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={figurative?.isFigurative || false}
                        onChange={(e) => onChange({ ...figurative, isFigurative: e.target.checked })}
                        className="rounded border-areia"
                    />
                    <label className="text-sm">Contains figurative language</label>
                </div>

                {figurative?.isFigurative && (
                    <div className="grid grid-cols-2 gap-4">
                        <SelectField
                            label="Figure Type"
                            value={figurative?.figureType}
                            options={FIGURE_TYPES}
                            onChange={(v) => onChange({ ...figurative, figureType: v })}
                            category="figure_type"
                        />
                        <SelectField
                            label="Transferability"
                            value={figurative?.transferability}
                            options={TRANSFERABILITY}
                            onChange={(v) => onChange({ ...figurative, transferability: v })}
                            category="transferability"
                        />
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Source Domain</label>
                            <Input
                                value={figurative?.sourceDomain || ''}
                                onChange={(e) => onChange({ ...figurative, sourceDomain: e.target.value })}
                                placeholder="e.g., shepherd"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Target Domain</label>
                            <Input
                                value={figurative?.targetDomain || ''}
                                onChange={(e) => onChange({ ...figurative, targetDomain: e.target.value })}
                                placeholder="e.g., God"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-preto mb-1.5 block">Literal Meaning</label>
                            <Textarea
                                value={figurative?.literalMeaning || ''}
                                onChange={(e) => onChange({ ...figurative, literalMeaning: e.target.value })}
                                placeholder="What does it literally say?"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-preto mb-1.5 block">Intended Meaning</label>
                            <Textarea
                                value={figurative?.intendedMeaning || ''}
                                onChange={(e) => onChange({ ...figurative, intendedMeaning: e.target.value })}
                                placeholder="What does it actually mean?"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-preto mb-1.5 block">Translation Note</label>
                            <Textarea
                                value={figurative?.translationNote || ''}
                                onChange={(e) => onChange({ ...figurative, translationNote: e.target.value })}
                                placeholder="Notes for translators..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    )
}
