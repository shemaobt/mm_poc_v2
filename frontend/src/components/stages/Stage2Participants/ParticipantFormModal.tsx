import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog'
import { CreatableSelect } from '../../ui/creatable-select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { ParticipantFormModalProps } from './types'
import {
    PARTICIPANT_TYPES_FALLBACK,
    QUANTITIES_FALLBACK,
    REFERENCE_STATUS_FALLBACK,
    PROPERTY_DIMENSIONS_FALLBACK
} from './constants'

export function ParticipantFormModal({
    open,
    onOpenChange,
    formData,
    setFormData,
    editingId,
    loading,
    onSubmit,
    newPropDimension,
    setNewPropDimension,
    newPropValue,
    setNewPropValue,
    onAddProperty,
    onRemoveProperty
}: ParticipantFormModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit Participant' : 'Add Participant'}</DialogTitle>
                    <DialogDescription>
                        Enter the participant details below.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">ID</label>
                            <Input
                                value={formData.participantId}
                                onChange={(e) => setFormData(prev => ({ ...prev, participantId: e.target.value }))}
                                placeholder="p1, p2..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Type</label>
                            <CreatableSelect
                                category="participant_type"
                                value={formData.type}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                                placeholder="Select type..."
                                fallbackOptions={PARTICIPANT_TYPES_FALLBACK}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Hebrew</label>
                            <Input
                                value={formData.hebrew}
                                onChange={(e) => setFormData(prev => ({ ...prev, hebrew: e.target.value }))}
                                placeholder="Hebrew text"
                                className="text-right"
                                dir="rtl"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Gloss (English)</label>
                            <Input
                                value={formData.gloss}
                                onChange={(e) => setFormData(prev => ({ ...prev, gloss: e.target.value }))}
                                placeholder="English translation"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Quantity</label>
                            <CreatableSelect
                                category="quantity"
                                value={formData.quantity}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, quantity: v }))}
                                placeholder="Select quantity..."
                                fallbackOptions={QUANTITIES_FALLBACK}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-preto mb-1.5 block">Reference Status</label>
                            <CreatableSelect
                                category="reference_status"
                                value={formData.referenceStatus}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, referenceStatus: v }))}
                                placeholder="Select status..."
                                fallbackOptions={REFERENCE_STATUS_FALLBACK}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="text-sm font-medium text-preto mb-2 block">Properties</label>

                        <div className="flex flex-wrap gap-2 mb-3">
                            {formData.properties?.map((prop, index) => (
                                <Badge key={index} variant="default" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-200">
                                    <span>{prop.dimension}: {prop.value}</span>
                                    <button onClick={() => onRemoveProperty(index)} className="hover:text-red-500 rounded-full p-0.5">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                            {(!formData.properties || formData.properties.length === 0) && (
                                <span className="text-sm text-gray-400 italic">No properties added</span>
                            )}
                        </div>

                        <div className="flex gap-2 items-end">
                            <div className="w-1/3">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Dimension</label>
                                <CreatableSelect
                                    category="property_dimension"
                                    value={newPropDimension}
                                    onValueChange={(v) => { setNewPropDimension(v); setNewPropValue('') }}
                                    placeholder="Select..."
                                    includeNA={false}
                                    fallbackOptions={PROPERTY_DIMENSIONS_FALLBACK}
                                    className="h-8"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Value</label>
                                <CreatableSelect
                                    category={newPropDimension ? `property_${newPropDimension}` : 'property_color'}
                                    value={newPropValue}
                                    onValueChange={setNewPropValue}
                                    placeholder="Select..."
                                    includeNA={false}
                                    disabled={!newPropDimension}
                                    className="h-8"
                                />
                            </div>
                            <Button size="sm" variant="secondary" onClick={onAddProperty} disabled={!newPropDimension || !newPropValue} className="h-8">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingId ? 'Save Changes' : 'Add Participant'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
