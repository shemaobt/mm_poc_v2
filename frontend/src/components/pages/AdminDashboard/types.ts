export interface AggregateMetrics {
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
    passage_stats: PassageStat[]
}

export interface PassageStat {
    reference: string
    modified: number
    deleted: number
    added: number
    ai_count: number
    created_at?: string
    updated_at?: string
}

export type TimeRange = 'today' | 'week' | 'month' | 'all'
