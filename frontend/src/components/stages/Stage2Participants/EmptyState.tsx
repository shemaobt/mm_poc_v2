import { Card, CardContent } from '../../ui/card'
import { Users } from 'lucide-react'
import { emptyStateStyles, cardStyles } from '@/styles'
import { EmptyStateProps } from './types'

export function EmptyState({ variant }: EmptyStateProps) {
    const message = variant === 'no-passage'
        ? 'Please fetch a passage in Stage 1 first.'
        : 'No participants yet. Click "Add Participant" or use AI Analyze in Stage 1.'

    return (
        <Card className={cardStyles.dashed}>
            <CardContent className={emptyStateStyles.container}>
                <Users className={emptyStateStyles.icon} />
                <p>{message}</p>
            </CardContent>
        </Card>
    )
}
