import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection'
import { SelectField } from './SelectField'
import { EmotionsSectionProps } from './types'
import { EMOTIONS, EMOTION_INTENSITIES, EMOTION_SOURCES, CONFIDENCE_LEVELS } from '../../../constants/tripod'

export function EmotionsSection({
    emotions,
    participants,
    onAddEmotion,
    onUpdateEmotion,
    onRemoveEmotion
}: EmotionsSectionProps) {
    return (
        <CollapsibleSection title="Emotion" emoji="💜" count={emotions?.length} variant="emotion">
            <div className="space-y-3">
                {(emotions || []).map((emo, i) => (
                    <div key={i} className="p-3 bg-areia/10 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Emotion {i + 1}</span>
                            <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onRemoveEmotion(i)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Primary Emotion"
                                value={emo.primary}
                                options={EMOTIONS}
                                onChange={(v) => onUpdateEmotion(i, 'primary', v)}
                                category="emotion_primary"
                            />
                            <SelectField
                                label="Secondary Emotion"
                                value={emo.secondary}
                                options={EMOTIONS}
                                onChange={(v) => onUpdateEmotion(i, 'secondary', v)}
                                category="emotion_primary"
                            />
                            <SelectField
                                label="Intensity"
                                value={emo.intensity}
                                options={EMOTION_INTENSITIES}
                                onChange={(v) => onUpdateEmotion(i, 'intensity', v)}
                                category="emotion_intensity"
                            />
                            <SelectField
                                label="Source"
                                value={emo.source}
                                options={EMOTION_SOURCES}
                                onChange={(v) => onUpdateEmotion(i, 'source', v)}
                                category="emotion_source"
                            />
                            <SelectField
                                label="Confidence"
                                value={emo.confidence}
                                options={CONFIDENCE_LEVELS}
                                onChange={(v) => onUpdateEmotion(i, 'confidence', v)}
                                category="confidence"
                            />
                            <Select 
                                value={emo.participantId || '__na__'} 
                                onValueChange={(v) => onUpdateEmotion(i, 'participantId', v === '__na__' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Who feels it?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                                    {participants.map(p => (
                                        <SelectItem key={p.id} value={p.participantId}>
                                            {p.participantId}: {p.gloss}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Textarea
                            placeholder="Notes..."
                            value={emo.notes || ''}
                            onChange={(e) => onUpdateEmotion(i, 'notes', e.target.value)}
                            className="mt-2"
                        />
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={onAddEmotion}>
                    <Plus className="w-4 h-4 mr-1" /> Add Emotion
                </Button>
            </div>
        </CollapsibleSection>
    )
}
