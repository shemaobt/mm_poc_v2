import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Filter, Calendar } from 'lucide-react'
import type { TimeRange } from './types'

interface TimeFilterCardProps {
    timeRange: TimeRange
    showCustomRange: boolean
    customStartDate: string
    customEndDate: string
    onTimeRangeChange: (range: TimeRange) => void
    onToggleCustomRange: () => void
    onCustomStartDateChange: (value: string) => void
    onCustomEndDateChange: (value: string) => void
    onApplyCustomFilter: () => void
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    all: 'All Time',
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days'
}

export function TimeFilterCard({
    timeRange,
    showCustomRange,
    customStartDate,
    customEndDate,
    onTimeRangeChange,
    onToggleCustomRange,
    onCustomStartDateChange,
    onCustomEndDateChange,
    onApplyCustomFilter
}: TimeFilterCardProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5 text-telha" />
                    Filter by Time
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-2">
                        {(['all', 'today', 'week', 'month'] as const).map((range) => (
                            <Button
                                key={range}
                                variant={timeRange === range && !showCustomRange ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onTimeRangeChange(range)}
                            >
                                {TIME_RANGE_LABELS[range]}
                            </Button>
                        ))}
                        <Button
                            variant={showCustomRange ? 'default' : 'outline'}
                            size="sm"
                            onClick={onToggleCustomRange}
                        >
                            <Calendar className="w-4 h-4 mr-1" />
                            Custom
                        </Button>
                    </div>

                    {showCustomRange && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => onCustomStartDateChange(e.target.value)}
                                className="w-40"
                                placeholder="Start date"
                            />
                            <span className="text-gray-500">to</span>
                            <Input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => onCustomEndDateChange(e.target.value)}
                                className="w-40"
                                placeholder="End date"
                            />
                            <Button size="sm" onClick={onApplyCustomFilter}>
                                Apply
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
