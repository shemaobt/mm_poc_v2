import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'

interface ChangedField {
    field: string
    count: number
}

interface CommonCorrectionsCardProps {
    topChangedFields: ChangedField[] | undefined
}

export function CommonCorrectionsCard({ topChangedFields }: CommonCorrectionsCardProps) {
    const hasData = topChangedFields && topChangedFields.length > 0

    return (
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>Common Corrections</CardTitle>
                <CardDescription>Fields most frequently edited by users</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasData ? (
                        topChangedFields.map((item, i) => (
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
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No edits recorded yet</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
