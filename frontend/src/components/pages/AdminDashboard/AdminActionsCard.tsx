import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Unlock, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'

interface AdminActionsCardProps {
    actionLoading: string | null
    showConfirmReset: boolean
    showConfirmDelete: boolean
    showConfirmFullReset: boolean
    onShowConfirmReset: (show: boolean) => void
    onShowConfirmDelete: (show: boolean) => void
    onShowConfirmFullReset: (show: boolean) => void
    onResetAllLocks: () => void
    onDeleteAllPassages: () => void
    onResetEverything: () => void
}

export function AdminActionsCard({
    actionLoading,
    showConfirmReset,
    showConfirmDelete,
    showConfirmFullReset,
    onShowConfirmReset,
    onShowConfirmDelete,
    onShowConfirmFullReset,
    onResetAllLocks,
    onDeleteAllPassages,
    onResetEverything
}: AdminActionsCardProps) {
    return (
        <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    Admin Actions (Destructive)
                </CardTitle>
                <CardDescription>These actions cannot be undone. Use with caution.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4">
                    {!showConfirmReset ? (
                        <Button
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => onShowConfirmReset(true)}
                        >
                            <Unlock className="w-4 h-4 mr-2" />
                            Reset All Locks
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            <span className="text-sm text-amber-700">Release all pericope locks?</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onShowConfirmReset(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={onResetAllLocks}
                                disabled={actionLoading === 'reset'}
                            >
                                {actionLoading === 'reset' ? 'Resetting...' : 'Confirm'}
                            </Button>
                        </div>
                    )}

                    {!showConfirmDelete ? (
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => onShowConfirmDelete(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All Passages
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                            <span className="text-sm text-red-700 font-medium">⚠️ Delete ALL passages and data?</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onShowConfirmDelete(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                onClick={onDeleteAllPassages}
                                disabled={actionLoading === 'delete'}
                            >
                                {actionLoading === 'delete' ? 'Deleting...' : 'Delete Passages'}
                            </Button>
                        </div>
                    )}

                    {!showConfirmFullReset ? (
                        <Button
                            variant="outline"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            onClick={() => onShowConfirmFullReset(true)}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Everything
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                            <span className="text-sm text-purple-700 font-medium">🔄 Complete system reset?</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onShowConfirmFullReset(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={onResetEverything}
                                disabled={actionLoading === 'fullReset'}
                            >
                                {actionLoading === 'fullReset' ? 'Resetting...' : 'Reset All Data'}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
