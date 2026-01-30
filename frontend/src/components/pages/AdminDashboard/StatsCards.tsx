import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { PenTool, Activity, Edit, FileText } from 'lucide-react'
import type { AggregateMetrics } from './types'

interface StatsCardsProps {
    metrics: AggregateMetrics | null
}

export function StatsCards({ metrics }: StatsCardsProps) {
    const hasAiData = metrics?.totals?.ai_items && metrics.totals.ai_items > 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total AI Items</CardTitle>
                    <PenTool className="h-4 w-4 text-telha" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totals?.ai_items || 0}</div>
                    <p className="text-xs text-muted-foreground">Generated across all passages</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">AI Accuracy (Est.)</CardTitle>
                    <Activity className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {hasAiData
                            ? `${(100 - (metrics.totals.modification_rate || 0)).toFixed(1)}%`
                            : '—'
                        }
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {hasAiData ? 'Based on unmodified items' : 'No AI data yet'}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Edits</CardTitle>
                    <Edit className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totals?.modified || 0}</div>
                    <p className="text-xs text-muted-foreground">User modifications to AI content</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Passages</CardTitle>
                    <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics?.passage_stats?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">With AI/User interaction</p>
                </CardContent>
            </Card>
        </div>
    )
}
