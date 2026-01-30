import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { NarratorAudienceSectionProps } from './types'
import { NARRATOR_STANCES, AUDIENCE_RESPONSES } from '../../../constants/tripod'

export function NarratorAudienceSection({
    narratorStance,
    audienceResponse,
    onNarratorChange,
    onAudienceChange
}: NarratorAudienceSectionProps) {
    return (
        <CollapsibleSection title="Narrator & Audience" emoji="📖" variant="emotion">
            <div className="grid grid-cols-2 gap-4">
                <SelectField
                    label="Narrator Stance"
                    value={narratorStance?.stance}
                    options={NARRATOR_STANCES}
                    onChange={(v) => onNarratorChange({ stance: v })}
                    category="narrator_stance"
                />
                <SelectField
                    label="Intended Audience Response"
                    value={audienceResponse?.response}
                    options={AUDIENCE_RESPONSES}
                    onChange={(v) => onAudienceChange({ response: v })}
                    category="audience_response"
                />
            </div>
        </CollapsibleSection>
    )
}
