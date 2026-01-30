import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Edit } from 'lucide-react'

interface ValueChange {
    entity: string
    field: string
    from: string
    to: string
    timestamp?: string
}

interface RecentActivityCardProps {
    recentValueChanges: ValueChange[] | undefined
}

export function RecentActivityCard({ recentValueChanges }: RecentActivityCardProps) {
    const hasData = recentValueChanges && recentValueChanges.length > 0

    return (
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest AI interactions and edits</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasData ? (
                        recentValueChanges.map((change, i) => (
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
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
