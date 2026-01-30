import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { PragmaticSectionProps } from './types'
import { DISCOURSE_REGISTERS, SOCIAL_AXES, PROMINENCE_LEVELS, PACING_OPTIONS } from '../../../constants/tripod'

export function PragmaticSection({ pragmatic, onChange }: PragmaticSectionProps) {
    return (
        <CollapsibleSection title="Pragmatic" emoji="🗣️" variant="pragmatic">
            <div className="grid grid-cols-2 gap-4">
                <SelectField
                    label="Register"
                    value={pragmatic?.register}
                    options={DISCOURSE_REGISTERS}
                    onChange={(v) => onChange({ ...pragmatic, register: v })}
                    category="discourse_register"
                />
                <SelectField
                    label="Social Axis"
                    value={pragmatic?.socialAxis}
                    options={SOCIAL_AXES}
                    onChange={(v) => onChange({ ...pragmatic, socialAxis: v })}
                    category="social_axis"
                />
                <SelectField
                    label="Prominence"
                    value={pragmatic?.prominence}
                    options={PROMINENCE_LEVELS}
                    onChange={(v) => onChange({ ...pragmatic, prominence: v })}
                    category="prominence"
                />
                <SelectField
                    label="Pacing"
                    value={pragmatic?.pacing}
                    options={PACING_OPTIONS}
                    onChange={(v) => onChange({ ...pragmatic, pacing: v })}
                    category="pacing"
                />
            </div>
        </CollapsibleSection>
    )
}
