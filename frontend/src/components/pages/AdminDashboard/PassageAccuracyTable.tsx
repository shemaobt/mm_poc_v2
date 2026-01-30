import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Badge } from '../../ui/badge'
import type { PassageStat } from './types'

interface PassageAccuracyTableProps {
    passageStats: PassageStat[] | undefined
}

function calculateAccuracy(stat: PassageStat): number {
    const totalEdits = stat.modified + stat.deleted + stat.added
    return stat.ai_count > 0 ? ((stat.ai_count - totalEdits) / stat.ai_count * 100) : 100
}

function getAccuracyColorClass(accuracy: number): string {
    if (accuracy > 80) return 'bg-green-500'
    if (accuracy > 50) return 'bg-yellow-500'
    return 'bg-red-500'
}

export function PassageAccuracyTable({ passageStats }: PassageAccuracyTableProps) {
    const hasData = passageStats && passageStats.length > 0

    return (
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
                            {hasData ? (
                                passageStats.map((stat) => {
                                    const totalEdits = stat.modified + stat.deleted + stat.added
                                    const accuracy = calculateAccuracy(stat)
                                    const lastActive = stat.updated_at || stat.created_at
                                    return (
                                        <tr key={stat.reference} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{stat.reference}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                                                        <div
                                                            className={`h-1.5 rounded-full ${getAccuracyColorClass(accuracy)}`}
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
                                    )
                                })
                            ) : (
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
    )
}
