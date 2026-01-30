import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Trash2 } from 'lucide-react'

interface DiscardSessionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function DiscardSessionDialog({ open, onOpenChange, onConfirm }: DiscardSessionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="w-5 h-5" />
                        Discard Session
                    </DialogTitle>
                    <DialogDescription>
                        This will clear your current work session and return you to the passage selection.
                        <br /><br />
                        <strong>Note:</strong> Data already saved to the database will not be deleted.
                        You can reload the same passage to continue working on it.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        className="gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Discard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
