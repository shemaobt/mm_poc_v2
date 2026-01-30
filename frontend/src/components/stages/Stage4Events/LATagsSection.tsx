import { Input } from '../../ui/input'
import { CollapsibleSection } from './CollapsibleSection'
import { LATagsSectionProps } from './types'

export function LATagsSection({ laRetrieval, onChange }: LATagsSectionProps) {
    const parseTagString = (value: string): string[] => 
        value.split(',').map(s => s.trim()).filter(Boolean)

    return (
        <CollapsibleSection title="LA Tags" emoji="🏷️" variant="la-tags">
            <p className="text-sm text-verde/70 mb-3">
                Tags for Language Assistant retrieval (comma-separated).
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-preto mb-1.5 block">Emotion Tags</label>
                    <Input
                        value={(laRetrieval?.emotionTags || []).join(', ')}
                        onChange={(e) => onChange({
                            ...laRetrieval,
                            emotionTags: parseTagString(e.target.value)
                        })}
                        placeholder="joy, hope, fear"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-preto mb-1.5 block">Event Tags</label>
                    <Input
                        value={(laRetrieval?.eventTags || []).join(', ')}
                        onChange={(e) => onChange({
                            ...laRetrieval,
                            eventTags: parseTagString(e.target.value)
                        })}
                        placeholder="creation, promise, judgment"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-preto mb-1.5 block">Register Tags</label>
                    <Input
                        value={(laRetrieval?.registerTags || []).join(', ')}
                        onChange={(e) => onChange({
                            ...laRetrieval,
                            registerTags: parseTagString(e.target.value)
                        })}
                        placeholder="formal, poetic"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-preto mb-1.5 block">Discourse Tags</label>
                    <Input
                        value={(laRetrieval?.discourseTags || []).join(', ')}
                        onChange={(e) => onChange({
                            ...laRetrieval,
                            discourseTags: parseTagString(e.target.value)
                        })}
                        placeholder="peak, background"
                    />
                </div>
            </div>
        </CollapsibleSection>
    )
}
