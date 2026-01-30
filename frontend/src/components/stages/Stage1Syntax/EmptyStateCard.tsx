import { Card, CardContent } from '../../ui/card'
import { BookOpen } from 'lucide-react'
import { emptyStateStyles, cardStyles } from '@/styles'

export function EmptyStateCard() {
    return (
        <Card className={cardStyles.dashed}>
            <CardContent className={emptyStateStyles.container}>
                <BookOpen className={emptyStateStyles.icon} />
                <p>Enter a passage reference above to begin analysis.</p>
            </CardContent>
        </Card>
    )
}
