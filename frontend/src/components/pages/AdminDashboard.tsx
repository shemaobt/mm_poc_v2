import { useState, useEffect } from 'react'
import { metricsAPI } from '../../services/api'
import UserManagement from './UserManagement'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
    FileText,
    Edit,
    Activity,
    RefreshCw,
    PenTool
} from 'lucide-react'

// Define types for metrics response - matches backend API
interface AggregateMetrics {
    totals: {
        ai_items: number
        modified: number
        deleted: number
        added: number
        modification_rate: number
    }
    top_changed_fields: {
        field: string
        count: number
    }[]
    recent_value_changes: {
        entity: string
        field: string
        from: string
        to: string
    }[]
    passage_stats: {
        reference: string
        modified: number
        deleted: number
        added: number
        ai_count: number
    }[]
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<AggregateMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [timeRange, _setTimeRange] = useState('all')
    // timeRange is used for filtering metrics (feature planned)

    const fetchMetrics = async () => {
        try {
            setLoading(true)
            const data = await metricsAPI.getAggregateMetrics()
            setMetrics(data)
            setError(null)
        } catch (err: any) {
            console.error('Failed to fetch metrics:', err)
            setError('Failed to load dashboard metrics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
    }, [timeRange])

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin w-8 h-8 border-4 border-telha border-t-transparent rounded-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block">
                    {error}
                </div>
                <div className="mt-4">
                    <Button onClick={fetchMetrics}>Try Again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Performance Dashboard</h1>
                    <p className="text-gray-500 mt-1">Tracking AI generation quality and user edits</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchMetrics}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics Cards */}
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
                            {metrics ? (100 - (metrics.totals.modification_rate || 0)).toFixed(1) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Based on unmodified items</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Changed Fields */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Common Corrections</CardTitle>
                        <CardDescription>Fields most frequently edited by users</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics?.top_changed_fields?.map((item: { field: string; count: number }, i: number) => (
                                <div key={i} className="flex items-center">
                                    <div className="w-full">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{item.field}</span>
                                            <span className="text-sm text-gray-500">{item.count} edits</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-telha h-2 rounded-full"
                                                style={{ width: `${Math.min(item.count * 10, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!metrics?.top_changed_fields || metrics.top_changed_fields.length === 0) && (
                                <p className="text-sm text-gray-500 text-center py-4">No edits recorded yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest AI interactions and edits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics?.recent_value_changes?.map((change: { entity: string; field: string; from: string; to: string }, i: number) => (
                                <div key={i} className="flex items-start pb-4 border-b last:border-0 last:pb-0">
                                    <div className="mt-1 p-1 rounded-full mr-3 flex-shrink-0 bg-blue-100 text-blue-600">
                                        <Edit className="w-3 h-3" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {change.entity} - {change.field}
                                        </p>
                                        <div className="text-xs text-gray-500 mt-1">
                                            <span className="line-through">{change.from}</span>
                                            <span className="mx-1">→</span>
                                            <span className="text-green-600">{change.to}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!metrics?.recent_value_changes || metrics.recent_value_changes.length === 0) && (
                                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Passage Performance Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Passage AI Accuracy</CardTitle>
                    <CardDescription>Performance metrics by passage</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Passage</th>
                                    <th className="px-4 py-3">AI Accuracy</th>
                                    <th className="px-4 py-3">Edits</th>
                                    <th className="px-4 py-3">Last Active</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics?.passage_stats?.map((stat: { reference: string; modified: number; deleted: number; added: number; ai_count: number }) => {
                                    const totalEdits = stat.modified + stat.deleted + stat.added;
                                    const accuracy = stat.ai_count > 0 ? ((stat.ai_count - totalEdits) / stat.ai_count * 100) : 100;
                                    return (
                                        <tr key={stat.reference} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{stat.reference}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                                                        <div
                                                            className={`h-1.5 rounded-full ${accuracy > 80 ? 'bg-green-500' :
                                                                accuracy > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${Math.max(0, accuracy)}%` }}
                                                        />
                                                    </div>
                                                    <span>{accuracy.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{totalEdits}</td>
                                            <td className="px-4 py-3">-</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={accuracy > 80 ? 'default' : 'secondary'}>
                                                    {accuracy > 80 ? 'Good' : 'Needs Review'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!metrics?.passage_stats || metrics.passage_stats.length === 0) && (
                                    <tr>
                                        <td className="px-4 py-8 text-center" colSpan={5}>
                                            No passage data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* User Management Section */}
            <UserManagement />
        </div>
    )
}
