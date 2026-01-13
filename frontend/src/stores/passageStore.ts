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

// Validation state for each stage
interface ValidationState {
    participants: Set<string>  // Set of validated participant IDs
    relations: Set<string>     // Set of validated relation IDs
    events: Set<string>        // Set of validated event IDs
    discourse: Set<string>     // Set of validated discourse IDs
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
    validated: ValidationState

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
    
    // Validation actions
    toggleValidation: (stage: keyof ValidationState, id: string) => void
    validateAll: (stage: keyof ValidationState, ids: string[]) => void
    isStageFullyValidated: (stage: keyof ValidationState, ids: string[]) => boolean
    getValidationCount: (stage: keyof ValidationState) => number
    clearValidation: () => void
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
            validated: {
                participants: new Set<string>(),
                relations: new Set<string>(),
                events: new Set<string>(),
                discourse: new Set<string>(),
            },

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
                snapshotId: null,
                validated: {
                    participants: new Set<string>(),
                    relations: new Set<string>(),
                    events: new Set<string>(),
                    discourse: new Set<string>(),
                }
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
            },

            // Validation actions
            toggleValidation: (stage, id) => {
                const { validated } = get()
                const newSet = new Set(validated[stage])
                if (newSet.has(id)) {
                    newSet.delete(id)
                } else {
                    newSet.add(id)
                }
                set({ validated: { ...validated, [stage]: newSet } })
            },
            
            validateAll: (stage, ids) => {
                const { validated } = get()
                set({ validated: { ...validated, [stage]: new Set(ids) } })
            },
            
            isStageFullyValidated: (stage, ids) => {
                const { validated } = get()
                if (ids.length === 0) return true
                return ids.every(id => validated[stage].has(id))
            },
            
            getValidationCount: (stage) => {
                const { validated } = get()
                return validated[stage].size
            },
            
            clearValidation: () => set({
                validated: {
                    participants: new Set<string>(),
                    relations: new Set<string>(),
                    events: new Set<string>(),
                    discourse: new Set<string>(),
                }
            })
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
                bhsaLoaded: state.bhsaLoaded,
                // Convert Sets to arrays for persistence
                validated: {
                    participants: Array.from(state.validated.participants),
                    relations: Array.from(state.validated.relations),
                    events: Array.from(state.validated.events),
                    discourse: Array.from(state.validated.discourse),
                }
            }),
            // Restore Sets from arrays
            merge: (persisted: any, current) => ({
                ...current,
                ...persisted,
                validated: {
                    participants: new Set(persisted?.validated?.participants || []),
                    relations: new Set(persisted?.validated?.relations || []),
                    events: new Set(persisted?.validated?.events || []),
                    discourse: new Set(persisted?.validated?.discourse || []),
                }
            })
        }
    )
)
