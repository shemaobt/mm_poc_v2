import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { SpeechActSectionProps } from './types'
import { SPEECH_ACTS, QUOTATION_TYPES } from '../../../constants/tripod'

export function SpeechActSection({ speechAct, onChange }: SpeechActSectionProps) {
    return (
        <CollapsibleSection
            title="Speech Act"
            emoji="💬"
            variant="speech"
            defaultOpen={true}
        >
            <div className="grid grid-cols-2 gap-4">
                <SelectField
                    label="Speech Act Type"
                    value={speechAct?.type}
                    options={SPEECH_ACTS}
                    onChange={(v) => onChange({ ...speechAct, type: v })}
                    category="speech_act_type"
                />
                <SelectField
                    label="Quotation Type"
                    value={speechAct?.quotationType}
                    options={QUOTATION_TYPES}
                    onChange={(v) => onChange({ ...speechAct, quotationType: v })}
                    category="quotation_type"
                />
            </div>
        </CollapsibleSection>
    )
}
