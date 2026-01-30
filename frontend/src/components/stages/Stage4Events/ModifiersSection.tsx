import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { ModifiersSectionProps } from './types'
import { MODIFIERS } from '../../../constants/tripod'
import { EventModifier } from '../../../types'

export function ModifiersSection({ modifiers, onUpdateModifier }: ModifiersSectionProps) {
    const hasValues = Object.values(modifiers || {}).some(v => !!v)
    
    return (
        <CollapsibleSection
            title="Modifiers"
            emoji="⚙️"
            variant="modifiers"
            defaultOpen={hasValues}
        >
            <div className="grid grid-cols-3 gap-4">
                {Object.entries(MODIFIERS).map(([key, mod]) => (
                    <SelectField
                        key={key}
                        label={mod.label}
                        value={modifiers?.[key as keyof EventModifier]}
                        options={mod.options}
                        onChange={(v) => onUpdateModifier(key as keyof EventModifier, v)}
                        category={`modifier_${key === 'onPurpose' ? 'on_purpose' : key === 'howKnown' ? 'how_known' : key}`}
                    />
                ))}
            </div>
        </CollapsibleSection>
    )
}
