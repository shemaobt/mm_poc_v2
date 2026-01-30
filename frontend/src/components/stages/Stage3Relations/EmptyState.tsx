import { GitBranch } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { emptyStateStyles, cardStyles } from '@/styles'

export function NoPassageState() {
    return (
        <Card className={cardStyles.dashed}>
            <CardContent className={emptyStateStyles.container}>
                <GitBranch className={emptyStateStyles.icon} />
                <p>Please fetch a passage in Stage 1 first.</p>
            </CardContent>
        </Card>
    )
}

export function NoRelationsState() {
    return (
        <Card className={cardStyles.dashed}>
            <CardContent className={emptyStateStyles.container}>
                <p>No relations defined yet.</p>
            </CardContent>
        </Card>
    )
}
