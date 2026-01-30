import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { CreatableSelect } from '../../ui/creatable-select'
import { Plus, Trash2 } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection'
import { RolesSectionProps } from './types'
import { SEMANTIC_ROLES } from '../../../constants/tripod'

export function RolesSection({
    roles,
    participants,
    onAddRole,
    onUpdateRole,
    onRemoveRole
}: RolesSectionProps) {
    return (
        <CollapsibleSection title="Roles" emoji="👥" count={roles.length} defaultOpen={true} variant="roles">
            <div className="space-y-2">
                {roles.map((role, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <CreatableSelect
                            category="semantic_role"
                            value={role.role}
                            onValueChange={(v) => onUpdateRole(i, 'role', v)}
                            placeholder="Select role..."
                            fallbackOptions={SEMANTIC_ROLES}
                            className="w-40"
                        />
                        <Select 
                            value={role.participantId || '__na__'} 
                            onValueChange={(v) => onUpdateRole(i, 'participantId', v === '__na__' ? null : v)}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select participant..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                                {participants.map((p, idx) => (
                                    <SelectItem key={p.id || `p-${p.participantId}-${idx}`} value={p.participantId}>
                                        {p.participantId}: {p.gloss}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onRemoveRole(i)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={onAddRole}>
                    <Plus className="w-4 h-4 mr-1" /> Add Role
                </Button>
            </div>
        </CollapsibleSection>
    )
}
