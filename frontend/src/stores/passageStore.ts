/**
 * Zustand store for passage data and application state
 */
import { create } from 'zustand'
import type { PassageData, ParticipantResponse, RelationResponse, EventResponse, DiscourseRelationResponse } from '../types'

// Type for AI analysis snapshot
interface AiSnapshotData {
    participants?: ParticipantResponse[]
    relations?: RelationResponse[]
    events?: EventResponse[]
    discourse?: DiscourseRelationResponse[]
}

interface PassageStore {
    // State
    passageData: PassageData | null
    participants: ParticipantResponse[]
    relations: RelationResponse[]
    events: EventResponse[]
    discourse: DiscourseRelationResponse[]
    loading: boolean
    error: string | null
    bhsaLoaded: boolean
    aiSnapshot: AiSnapshotData | null
    snapshotId: string | null

    // Actions
    setPassageData: (data: PassageData) => void
    setParticipants: (participants: ParticipantResponse[]) => void
    setRelations: (relations: RelationResponse[]) => void
    setEvents: (events: EventResponse[]) => void
    setDiscourse: (discourse: DiscourseRelationResponse[]) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setBhsaLoaded: (loaded: boolean) => void
    clearPassage: () => void
    setAiSnapshot: (data: AiSnapshotData, snapshotId: string) => void
    trackEdit: (action: string, entityType: string, entityId: string, fieldName?: string, oldValue?: unknown, newValue?: unknown, isAiGenerated?: boolean) => Promise<void>
}

import { persist } from 'zustand/middleware'

export const usePassageStore = create<PassageStore>()(
    persist(
        (set, get) => ({
            // Initial state
            passageData: null,
            participants: [],
            relations: [],
            events: [],
            discourse: [],
            loading: false,
            error: null,
            bhsaLoaded: false,
            aiSnapshot: null,
            snapshotId: null,

            // Actions
            setPassageData: (data) => set({ passageData: data, error: null }),
            setParticipants: (participants) => set({ participants }),
            setRelations: (relations) => set({ relations }),
            setEvents: (events) => set({ events }),
            setDiscourse: (discourse) => set({ discourse }),
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error, loading: false }),
            setBhsaLoaded: (loaded) => set({ bhsaLoaded: loaded }),
            clearPassage: () => set({
                passageData: null,
                participants: [],
                relations: [],
                events: [],
                discourse: [],
                error: null,
                aiSnapshot: null,
                snapshotId: null
            }),

            // AI Tracking
            setAiSnapshot: (data: any, snapshotId: string) => set({ aiSnapshot: data, snapshotId }),
            trackEdit: async (action: any, entityType: any, entityId: any, fieldName?: any, oldValue?: any, newValue?: any, isAiGenerated = false) => {
                const { snapshotId } = get()
                if (!snapshotId) return

                try {
                    await import('../services/api').then(m => m.metricsAPI.logEdit(
                        snapshotId,
                        action,
                        entityType,
                        entityId,
                        fieldName,
                        oldValue,
                        newValue,
                        isAiGenerated
                    ))
                } catch (err) {
                    console.error('Failed to log edit:', err)
                }
            }
        }),
        {
            name: 'passage-storage',
            partialize: (state) => ({
                passageData: state.passageData,
                participants: state.participants,
                relations: state.relations,
                events: state.events,
                discourse: state.discourse,
                aiSnapshot: state.aiSnapshot,
                snapshotId: state.snapshotId,
                bhsaLoaded: state.bhsaLoaded
            }),
        }
    )
)
