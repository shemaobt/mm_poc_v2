import { Loader2, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { CreatableSelect } from '../../ui/creatable-select'
import { ParticipantSelect } from './ParticipantSelect'
import { RELATION_CATEGORIES_FALLBACK } from './constants'
import { RelationFormProps } from './types'

export function RelationForm({
    formData,
    participants,
    editingId,
    loading,
    onFormChange,
    onSubmit,
    onCancel
}: RelationFormProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-telha" />
                    {editingId ? 'Edit Relation' : 'Add New Relation'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">
                            Source Participant
                        </label>
                        <ParticipantSelect
                            value={formData.sourceId}
                            participants={participants}
                            placeholder="Select Source..."
                            onValueChange={(v) => onFormChange({ ...formData, sourceId: v })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">
                            Target Participant
                        </label>
                        <ParticipantSelect
                            value={formData.targetId}
                            participants={participants}
                            placeholder="Select Target..."
                            onValueChange={(v) => onFormChange({ ...formData, targetId: v })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">
                            Category
                        </label>
                        <CreatableSelect
                            category="relation_category"
                            value={formData.category}
                            onValueChange={(v) => onFormChange({ ...formData, category: v })}
                            placeholder="Select category..."
                            fallbackOptions={RELATION_CATEGORIES_FALLBACK}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-preto mb-1.5 block">
                            Relation Type
                        </label>
                        <Input
                            value={formData.type}
                            onChange={(e) => onFormChange({ ...formData, type: e.target.value })}
                            placeholder="e.g. parent_of, master_of"
                        />
                    </div>

                    <div className="flex gap-2">
                        {editingId && (
                            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Update Relation' : 'Add Relation'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
