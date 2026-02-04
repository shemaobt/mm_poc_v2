import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Loader2 } from 'lucide-react'
import { EventModalProps } from './types'
import { errorStateStyles } from '@/styles'
import { SelectField } from './SelectField'
import { RolesSection } from './RolesSection'
import { ModifiersSection } from './ModifiersSection'
import { SpeechActSection } from './SpeechActSection'
import { PragmaticSection } from './PragmaticSection'
import { EmotionsSection } from './EmotionsSection'
import { NarratorAudienceSection } from './NarratorAudienceSection'
import { FigurativeSection } from './FigurativeSection'
import { KeyTermsSection } from './KeyTermsSection'
import { LATagsSection } from './LATagsSection'
import { EVENT_CATEGORIES, MODIFIERS, NARRATIVE_FUNCTIONS, DISCOURSE_FUNCTIONS } from '../../../constants/tripod'
import { EventRoleBase, EventModifier, EventEmotion, KeyTerm } from '../../../types'

export function EventModal({
    open,
    onOpenChange,
    formData,
    setFormData,
    participants,
    segmentOptions,
    editingId,
    loading,
    error,
    onSubmit
}: EventModalProps) {
    const addRole = () => {
        setFormData({
            ...formData,
            roles: [...formData.roles, { role: 'doer', participantId: null }]
        })
    }

    const updateRole = (index: number, field: keyof EventRoleBase, value: string | null) => {
        const newRoles = [...formData.roles]
        newRoles[index] = { ...newRoles[index], [field]: value }
        setFormData({ ...formData, roles: newRoles })
    }

    const removeRole = (index: number) => {
        const newRoles = formData.roles.filter((_, i) => i !== index)
        setFormData({ ...formData, roles: newRoles })
    }

    const updateModifier = (key: keyof EventModifier, value: string) => {
        setFormData({
            ...formData,
            modifiers: { ...formData.modifiers, [key]: value }
        })
    }

    const addEmotion = () => {
        setFormData({
            ...formData,
            emotions: [...(formData.emotions || []), {
                primary: '',
                intensity: '',
                source: '',
                confidence: ''
            }]
        })
    }

    const updateEmotion = (index: number, field: keyof EventEmotion, value: string) => {
        const newEmotions = [...(formData.emotions || [])]
        newEmotions[index] = { ...newEmotions[index], [field]: value }
        setFormData({ ...formData, emotions: newEmotions })
    }

    const removeEmotion = (index: number) => {
        const newEmotions = (formData.emotions || []).filter((_, i) => i !== index)
        setFormData({ ...formData, emotions: newEmotions })
    }

    const addKeyTerm = () => {
        setFormData({
            ...formData,
            keyTerms: [...(formData.keyTerms || []), {
                termId: `kt${(formData.keyTerms?.length || 0) + 1}`,
                sourceLemma: '',
                semanticDomain: 'theological',
                consistency: 'preferred'
            }]
        })
    }

    const updateKeyTerm = (index: number, field: keyof KeyTerm, value: string) => {
        const newTerms = [...(formData.keyTerms || [])]
        newTerms[index] = { ...newTerms[index], [field]: value }
        setFormData({ ...formData, keyTerms: newTerms })
    }

    const removeKeyTerm = (index: number) => {
        const newTerms = (formData.keyTerms || []).filter((_, i) => i !== index)
        setFormData({ ...formData, keyTerms: newTerms })
    }

    const showSpeechAct = formData.category === 'SPEECH' ||
        formData.category === 'COMMUNICATION' ||
        formData.speechAct?.type ||
        formData.speechAct?.quotationType

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle>
                    <DialogDescription>Define an event with its category, roles, modifiers, and more.</DialogDescription>
                </DialogHeader>

                {error && (
                    <div className={errorStateStyles.banner}>
                        <p className={errorStateStyles.text}>Error: {error}</p>
                    </div>
                )}

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Event ID</label>
                            <Input
                                value={formData.eventId}
                                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                placeholder="e1, e2..."
                            />
                        </div>
                        <SelectField
                            label="Category"
                            value={formData.category}
                            options={EVENT_CATEGORIES}
                            onChange={(v) => setFormData({ ...formData, category: v })}
                            category="event_category"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">Associated Segment (Clause)</label>
                        <Select
                            value={formData.clauseId || "unassigned"}
                            onValueChange={(v) => setFormData({ ...formData, clauseId: v === "unassigned" ? undefined : v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a segment..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {segmentOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">Event Core (Concept)</label>
                        <Input
                            value={formData.eventCore}
                            onChange={(e) => setFormData({ ...formData, eventCore: e.target.value })}
                            placeholder="e.g. go, say, create"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField
                            label="Viewpoint (Aspect)"
                            value={formData.modifiers?.viewpoint}
                            options={MODIFIERS.viewpoint.options}
                            onChange={(v) => updateModifier('viewpoint', v)}
                            category="modifier_viewpoint"
                        />
                        <SelectField
                            label="Causation"
                            value={formData.modifiers?.causation}
                            options={MODIFIERS.causation.options}
                            onChange={(v) => updateModifier('causation', v)}
                            category="modifier_causation"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField
                            label="Narrative Function"
                            value={formData.narrativeFunction}
                            options={NARRATIVE_FUNCTIONS}
                            onChange={(v) => setFormData({ ...formData, narrativeFunction: v })}
                            category="narrative_function"
                        />
                        <SelectField
                            label="Discourse Function"
                            value={formData.discourseFunction}
                            options={DISCOURSE_FUNCTIONS}
                            onChange={(v) => setFormData({ ...formData, discourseFunction: v })}
                            category="discourse_function"
                        />
                    </div>

                    <div className="space-y-3 pt-4">
                        <RolesSection
                            roles={formData.roles}
                            participants={participants}
                            onAddRole={addRole}
                            onUpdateRole={updateRole}
                            onRemoveRole={removeRole}
                        />

                        <ModifiersSection
                            modifiers={formData.modifiers || {}}
                            onUpdateModifier={updateModifier}
                        />

                        {showSpeechAct && (
                            <SpeechActSection
                                speechAct={formData.speechAct || {}}
                                onChange={(speechAct) => setFormData({ ...formData, speechAct })}
                            />
                        )}

                        <PragmaticSection
                            pragmatic={formData.pragmatic || {}}
                            onChange={(pragmatic) => setFormData({ ...formData, pragmatic })}
                        />

                        <EmotionsSection
                            emotions={formData.emotions || []}
                            participants={participants}
                            onAddEmotion={addEmotion}
                            onUpdateEmotion={updateEmotion}
                            onRemoveEmotion={removeEmotion}
                        />

                        <NarratorAudienceSection
                            narratorStance={formData.narratorStance || {}}
                            audienceResponse={formData.audienceResponse || {}}
                            onNarratorChange={(stance) => setFormData({ ...formData, narratorStance: stance })}
                            onAudienceChange={(response) => setFormData({ ...formData, audienceResponse: response })}
                        />

                        <FigurativeSection
                            figurative={formData.figurative || {}}
                            onChange={(figurative) => setFormData({ ...formData, figurative })}
                        />

                        <KeyTermsSection
                            keyTerms={formData.keyTerms || []}
                            onAddKeyTerm={addKeyTerm}
                            onUpdateKeyTerm={updateKeyTerm}
                            onRemoveKeyTerm={removeKeyTerm}
                        />

                        <LATagsSection
                            laRetrieval={formData.laRetrieval || {}}
                            onChange={(laRetrieval) => setFormData({ ...formData, laRetrieval })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={onSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingId ? 'Save Changes' : 'Add Event'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
