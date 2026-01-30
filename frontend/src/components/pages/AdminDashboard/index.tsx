import { useState, useEffect } from 'react'
import { metricsAPI, pericopesAPI, MetricsFilter } from '../../../services/api'
import UserManagement from '../UserManagement'
import UserProgressDashboard from '../UserProgress'
import { Button } from '../../ui/button'
import { toast } from 'sonner'
import { errorStateStyles } from '@/styles'

import type { AggregateMetrics, TimeRange } from './types'
import { DashboardHeader } from './DashboardHeader'
import { TimeFilterCard } from './TimeFilterCard'
import { AdminActionsCard } from './AdminActionsCard'
import { StatsCards } from './StatsCards'
import { CommonCorrectionsCard } from './CommonCorrectionsCard'
import { RecentActivityCard } from './RecentActivityCard'
import { PassageAccuracyTable } from './PassageAccuracyTable'

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<AggregateMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [timeRange, setTimeRange] = useState<TimeRange>('all')
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
            fetchMetrics()
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
            fetchMetrics()
        } catch (err: any) {
            console.error('Failed to reset everything:', err)
            toast.error('Failed to reset', {
                description: err.response?.data?.detail || 'An error occurred'
            })
        } finally {
            setActionLoading(null)
        }
    }

    const handleTimeRangeChange = (range: TimeRange) => {
        setTimeRange(range)
        setShowCustomRange(false)
    }

    const handleToggleCustomRange = () => {
        setShowCustomRange(!showCustomRange)
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
                <div className={`${errorStateStyles.banner} inline-block`}>
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
            <DashboardHeader loading={loading} onRefresh={fetchMetrics} />

            <TimeFilterCard
                timeRange={timeRange}
                showCustomRange={showCustomRange}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onTimeRangeChange={handleTimeRangeChange}
                onToggleCustomRange={handleToggleCustomRange}
                onCustomStartDateChange={setCustomStartDate}
                onCustomEndDateChange={setCustomEndDate}
                onApplyCustomFilter={fetchMetrics}
            />

            <AdminActionsCard
                actionLoading={actionLoading}
                showConfirmReset={showConfirmReset}
                showConfirmDelete={showConfirmDelete}
                showConfirmFullReset={showConfirmFullReset}
                onShowConfirmReset={setShowConfirmReset}
                onShowConfirmDelete={setShowConfirmDelete}
                onShowConfirmFullReset={setShowConfirmFullReset}
                onResetAllLocks={handleResetAllLocks}
                onDeleteAllPassages={handleDeleteAllPassages}
                onResetEverything={handleResetEverything}
            />

            <StatsCards metrics={metrics} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CommonCorrectionsCard topChangedFields={metrics?.top_changed_fields} />
                <RecentActivityCard recentValueChanges={metrics?.recent_value_changes} />
            </div>

            <PassageAccuracyTable passageStats={metrics?.passage_stats} />

            <UserProgressDashboard />

            <UserManagement />
        </div>
    )
}
