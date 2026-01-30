import { Button } from '../../ui/button'
import { RefreshCw } from 'lucide-react'

interface DashboardHeaderProps {
    loading: boolean
    onRefresh: () => void
}

export function DashboardHeader({ loading, onRefresh }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">AI Performance Dashboard</h1>
                <p className="text-gray-500 mt-1">Tracking AI generation quality and user edits</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
        </div>
    )
}
