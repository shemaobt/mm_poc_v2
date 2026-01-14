import { useState, useEffect } from 'react'
import { metricsAPI, pericopesAPI, MetricsFilter } from '../../services/api'
import UserManagement from './UserManagement'
import UserProgressDashboard from './UserProgress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import {
    FileText,
    Edit,
    Activity,
    RefreshCw,
    PenTool,
    Trash2,
    Unlock,
    AlertTriangle,
    Calendar,
    Filter,
    RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

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
        timestamp?: string
    }[]
    passage_stats: {
        reference: string
        modified: number
        deleted: number
        added: number
        ai_count: number
        created_at?: string
        updated_at?: string
    }[]
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<AggregateMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [showCustomRange, setShowCustomRange] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [showConfirmReset, setShowConfirmReset] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [showConfirmFullReset, setShowConfirmFullReset] = useState(false)

    const fetchMetrics = async () => {
        try {
            setLoading(true)
            const filter: MetricsFilter = {}
            
            if (showCustomRange && (customStartDate || customEndDate)) {
                if (customStartDate) filter.start_date = customStartDate
                if (customEndDate) filter.end_date = customEndDate
            } else if (timeRange !== 'all') {
                filter.time_range = timeRange
            }
            
            const data = await metricsAPI.getAggregateMetrics(filter)
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
    }, [timeRange, showCustomRange])

    const handleResetAllLocks = async () => {
        try {
            setActionLoading('reset')
            await pericopesAPI.resetAllLocks()
            toast.success('All locks reset', {
                description: 'All pericope locks have been released'
            })
            setShowConfirmReset(false)
        } catch (err: any) {
            console.error('Failed to reset locks:', err)
            toast.error('Failed to reset locks', {
                description: err.response?.data?.detail || 'An error occurred'
            })
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteAllPassages = async () => {
        try {
            setActionLoading('delete')
            await pericopesAPI.deleteAllPassages()
            toast.success('All passages deleted', {
                description: 'All passages and related data have been removed'
            })
            setShowConfirmDelete(false)
            fetchMetrics() // Refresh metrics
        } catch (err: any) {
            console.error('Failed to delete passages:', err)
            toast.error('Failed to delete passages', {
                description: err.response?.data?.detail || 'An error occurred'
            })
        } finally {
            setActionLoading(null)
        }
    }

    const handleResetEverything = async () => {
        try {
            setActionLoading('fullReset')
            const result = await pericopesAPI.resetEverything()
            toast.success('Complete Reset Successful', {
                description: `Deleted: ${result.deleted_counts?.passages || 0} passages, ${result.deleted_counts?.snapshots || 0} snapshots, ${result.deleted_counts?.edit_logs || 0} edit logs`
            })
            setShowConfirmFullReset(false)
            fetchMetrics() // Refresh metrics
        } catch (err: any) {
            console.error('Failed to reset everything:', err)
            toast.error('Failed to reset', {
                description: err.response?.data?.detail || 'An error occurred'
            })
        } finally {
            setActionLoading(null)
        }
    }

    const applyCustomDateFilter = () => {
        fetchMetrics()
    }

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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Performance Dashboard</h1>
                    <p className="text-gray-500 mt-1">Tracking AI generation quality and user edits</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Time Filter Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="w-5 h-5 text-telha" />
                        Filter by Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Predefined ranges */}
                        <div className="flex gap-2">
                            {(['all', 'today', 'week', 'month'] as const).map((range) => (
                                <Button
                                    key={range}
                                    variant={timeRange === range && !showCustomRange ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setTimeRange(range)
                                        setShowCustomRange(false)
                                    }}
                                >
                                    {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                                </Button>
                            ))}
                            <Button
                                variant={showCustomRange ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setShowCustomRange(!showCustomRange)}
                            >
                                <Calendar className="w-4 h-4 mr-1" />
                                Custom
                            </Button>
                        </div>

                        {/* Custom date range */}
                        {showCustomRange && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-40"
                                    placeholder="Start date"
                                />
                                <span className="text-gray-500">to</span>
                                <Input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-40"
                                    placeholder="End date"
                                />
                                <Button size="sm" onClick={applyCustomDateFilter}>
                                    Apply
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Admin Actions */}
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
                        {/* Reset All Locks */}
                        {!showConfirmReset ? (
                            <Button
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => setShowConfirmReset(true)}
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
                                    onClick={() => setShowConfirmReset(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={handleResetAllLocks}
                                    disabled={actionLoading === 'reset'}
                                >
                                    {actionLoading === 'reset' ? 'Resetting...' : 'Confirm'}
                                </Button>
                            </div>
                        )}

                        {/* Delete All Passages */}
                        {!showConfirmDelete ? (
                            <Button
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => setShowConfirmDelete(true)}
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
                                    onClick={() => setShowConfirmDelete(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={handleDeleteAllPassages}
                                    disabled={actionLoading === 'delete'}
                                >
                                    {actionLoading === 'delete' ? 'Deleting...' : 'Delete Passages'}
                                </Button>
                            </div>
                        )}

                        {/* Complete System Reset */}
                        {!showConfirmFullReset ? (
                            <Button
                                variant="outline"
                                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => setShowConfirmFullReset(true)}
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
                                    onClick={() => setShowConfirmFullReset(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={handleResetEverything}
                                    disabled={actionLoading === 'fullReset'}
                                >
                                    {actionLoading === 'fullReset' ? 'Resetting...' : 'Reset All Data'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

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
                            {metrics && metrics.totals && metrics.totals.ai_items && metrics.totals.ai_items > 0 
                                ? `${(100 - (metrics.totals.modification_rate || 0)).toFixed(1)}%`
                                : '—'
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {metrics && metrics.totals && metrics.totals.ai_items && metrics.totals.ai_items > 0 
                                ? 'Based on unmodified items' 
                                : 'No AI data yet'
                            }
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
                            {metrics?.recent_value_changes?.map((change: { entity: string; field: string; from: string; to: string; timestamp?: string }, i: number) => (
                                <div key={i} className="flex items-start pb-4 border-b last:border-0 last:pb-0">
                                    <div className="mt-1 p-1 rounded-full mr-3 flex-shrink-0 bg-blue-100 text-blue-600">
                                        <Edit className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-medium text-gray-900">
                                                {change.entity} - {change.field}
                                            </p>
                                            {change.timestamp && (
                                                <span className="text-xs text-gray-400">
                                                    {new Date(change.timestamp).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
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
                                {metrics?.passage_stats?.map((stat: { reference: string; modified: number; deleted: number; added: number; ai_count: number; created_at?: string; updated_at?: string }) => {
                                    const totalEdits = stat.modified + stat.deleted + stat.added;
                                    const accuracy = stat.ai_count > 0 ? ((stat.ai_count - totalEdits) / stat.ai_count * 100) : 100;
                                    const lastActive = stat.updated_at || stat.created_at;
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
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {lastActive ? new Date(lastActive).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={accuracy > 80 ? 'success' : 'warning'}>
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

            {/* User Progress Section */}
            <UserProgressDashboard />

            {/* User Management Section */}
            <UserManagement />
        </div>
    )
}
