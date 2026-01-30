import { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { mapsAPI, passagesAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { BookOpen, Download, Calendar, ArrowLeft, FileJson, Trash2, AlertTriangle, User, Eye } from 'lucide-react'
import { pageStyles, errorStateStyles, cardStyles, stageHeaderStyles } from '@/styles'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog'

interface SavedMap {
    id: string
    reference: string
    isComplete: boolean
    completedAt: string | null
    createdAt: string | null
    peakEvent: string | null
    thematicSpine: string | null
    participantCount: number
    eventCount: number
    userId: string | null
    ownerName: string | null
}

interface SavedMapsPageProps {
    onBack: () => void
    onOpenPassage?: (passageId: string, readOnly: boolean) => void
}

export default function SavedMapsPage({ onBack, onOpenPassage }: SavedMapsPageProps) {
    const { user, isAdmin } = useAuth()
    const [maps, setMaps] = useState<SavedMap[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [exporting, setExporting] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [mapToDelete, setMapToDelete] = useState<SavedMap | null>(null)

    const canDelete = (map: SavedMap): boolean => {
        if (isAdmin) return true
        return map.userId === user?.id
    }

    useEffect(() => {
        loadMaps()
    }, [])

    const loadMaps = async () => {
        try {
            setLoading(true)
            const data = await mapsAPI.listCompleted()
            setMaps(data.passages || [])
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load saved maps')
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (passageId: string, reference: string) => {
        try {
            setExporting(passageId)
            const data = await mapsAPI.exportPassage(passageId)

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${reference.replace(/\s+/g, '_')}_tripod_v5_2.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to export map')
        } finally {
            setExporting(null)
        }
    }

    const handleDelete = async () => {
        if (!mapToDelete) return

        try {
            setDeleting(mapToDelete.id)
            await passagesAPI.delete(mapToDelete.id)
            setMaps(maps.filter(m => m.id !== mapToDelete.id))
            setMapToDelete(null)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete map')
        } finally {
            setDeleting(null)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className={pageStyles.title}>
                            <FileJson className={stageHeaderStyles.icon} />
                            My Meaning Maps
                        </h1>
                        <p className={pageStyles.subtitle}>Saved analyses stored in the database</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className={errorStateStyles.banner}>
                    {error}
                </div>
            )}

            {loading && (
                <div className="text-center py-12 text-verde">
                    <div className="animate-spin w-8 h-8 border-4 border-telha border-t-transparent rounded-full mx-auto mb-4" />
                    Loading saved maps...
                </div>
            )}

            {!loading && maps.length === 0 && (
                <Card className={cardStyles.dashed}>
                    <CardContent className="py-16 text-center">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-areia" />
                        <h3 className="text-lg font-medium text-preto mb-2">No Meaning Maps Yet</h3>
                        <p className="text-verde max-w-md mx-auto">
                            Start analyzing a passage to create your first meaning map.
                        </p>
                        <Button onClick={onBack} className="mt-6">
                            Start Analyzing
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!loading && maps.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {maps.map((map) => (
                        <Card key={map.id} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <h3
                                        className="text-lg font-semibold text-preto cursor-pointer hover:text-telha"
                                        onClick={() => onOpenPassage?.(String(map.id), true)}
                                    >
                                        {map.reference}
                                    </h3>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${map.isComplete
                                            ? 'bg-verde-claro/10 text-verde-claro'
                                            : 'bg-telha/10 text-telha'
                                        }`}>
                                        {map.isComplete ? 'Complete' : 'In Progress'}
                                    </span>
                                </div>

                                {map.thematicSpine && (
                                    <p className="text-sm text-verde mb-4 line-clamp-2">
                                        {map.thematicSpine}
                                    </p>
                                )}

                                <div className="flex gap-4 text-xs text-verde/70 mb-4">
                                    <span>{map.participantCount} participants</span>
                                    <span>{map.eventCount} events</span>
                                </div>

                                <div className="flex items-center text-xs text-verde/70 mb-2">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {formatDate(map.completedAt || map.createdAt)}
                                </div>

                                {map.ownerName && (
                                    <div className="flex items-center text-xs text-verde/70 mb-4">
                                        <User className="w-3 h-3 mr-1" />
                                        By: <span className="font-medium ml-1">{map.ownerName}</span>
                                    </div>
                                )}

                                {map.peakEvent && (
                                    <div className="text-xs text-verde/70 mb-4">
                                        Peak: <span className="font-medium">{map.peakEvent}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {onOpenPassage && (
                                        <Button
                                            onClick={() => onOpenPassage(String(map.id), true)}
                                            variant="default"
                                            className="gap-2 bg-telha hover:bg-telha/90"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Open
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => handleExport(map.id, map.reference)}
                                        disabled={exporting === map.id}
                                        variant="outline"
                                        className="flex-1 gap-2 min-w-0"
                                    >
                                        {exporting === map.id ? (
                                            <div className="animate-spin w-4 h-4 border-2 border-telha border-t-transparent rounded-full" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        Export Tripod JSON
                                    </Button>
                                    {canDelete(map) && (
                                        <Button
                                            onClick={() => setMapToDelete(map)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-verde/50 hover:text-red-600 hover:bg-red-50"
                                            title={isAdmin && map.userId !== user?.id ? "Delete (Admin)" : "Delete your map"}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!mapToDelete} onOpenChange={() => setMapToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Meaning Map
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{mapToDelete?.reference}</strong>?
                            This action cannot be undone and will permanently remove all participants,
                            events, and analysis data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={!!deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
