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
    readOnly: boolean  // When true, open from Saved Maps — same UI, no edits
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
    checkedClauses: Set<string>  // Stage 1 clause read-check state

    // Actions (setters accept value or updater function for safe async updates)
    setPassageData: (data: PassageData) => void
    setReadOnly: (readOnly: boolean) => void
    setParticipants: (participants: ParticipantResponse[] | ((prev: ParticipantResponse[]) => ParticipantResponse[])) => void
    setRelations: (relations: RelationResponse[] | ((prev: RelationResponse[]) => RelationResponse[])) => void
    setEvents: (events: EventResponse[] | ((prev: EventResponse[]) => EventResponse[])) => void
    setDiscourse: (discourse: DiscourseRelationResponse[] | ((prev: DiscourseRelationResponse[]) => DiscourseRelationResponse[])) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setBhsaLoaded: (loaded: boolean) => void
    clearPassage: () => void
    discardSession: () => void  // Clears local state and localStorage (keeps DB data)
    setAiSnapshot: (data: AiSnapshotData, snapshotId: string) => void
    trackEdit: (action: string, entityType: string, entityId: string, fieldName?: string, oldValue?: unknown, newValue?: unknown, isAiGenerated?: boolean) => Promise<void>
    
    // Validation actions
    toggleValidation: (stage: keyof ValidationState, id: string) => void
    validateAll: (stage: keyof ValidationState, ids: string[]) => void
    isStageFullyValidated: (stage: keyof ValidationState, ids: string[]) => boolean
    getValidationCount: (stage: keyof ValidationState) => number
    clearValidation: () => void
    
    // Clause check actions (Stage 1)
    setCheckedClauses: (clauses: Set<string>) => void
    toggleClauseCheck: (clauseId: string) => void
    
    // Data fetching actions
    fetchEvents: (passageId: string) => Promise<void>
    fetchDiscourse: (passageId: string) => Promise<void>
}

import { persist } from 'zustand/middleware'

export const usePassageStore = create<PassageStore>()(
    persist(
        (set, get) => ({
            // Initial state
            passageData: null,
            readOnly: false,
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
            checkedClauses: new Set<string>(),

            // Actions
            setPassageData: (data) => set({ passageData: data, error: null }),
            setParticipants: (arg) => set({
                participants: typeof arg === 'function' ? arg(get().participants) : arg
            }),
            setRelations: (arg) => set({
                relations: typeof arg === 'function' ? arg(get().relations) : arg
            }),
            setEvents: (arg) => set({
                events: typeof arg === 'function' ? arg(get().events) : arg
            }),
            setDiscourse: (arg) => set({
                discourse: typeof arg === 'function' ? arg(get().discourse) : arg
            }),
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error, loading: false }),
            setBhsaLoaded: (loaded) => set({ bhsaLoaded: loaded }),
            clearPassage: () => set({
                passageData: null,
                readOnly: false,
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
                },
                checkedClauses: new Set<string>()
            }),
            setReadOnly: (readOnly) => set({ readOnly }),
            
            // Discard session: clears local state AND localStorage (keeps DB data intact)
            discardSession: () => {
                // Clear localStorage for this store
                localStorage.removeItem('passage-storage')
                
                // Reset state
                set({
                    passageData: null,
                    readOnly: false,
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
                    },
                    checkedClauses: new Set<string>()
                })
            },

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
            }),
            
            // Clause check actions (Stage 1)
            setCheckedClauses: (clauses) => set({ checkedClauses: clauses }),
            toggleClauseCheck: (clauseId) => {
                const { checkedClauses } = get()
                const newSet = new Set(checkedClauses)
                if (newSet.has(clauseId)) {
                    newSet.delete(clauseId)
                } else {
                    newSet.add(clauseId)
                }
                set({ checkedClauses: newSet })
            },
            
            // Data fetching
            fetchEvents: async (passageId: string) => {
                try {
                    const { bhsaAPI } = await import('../services/api')
                    const events = await bhsaAPI.getEvents(passageId)
                    set({ events })
                } catch (err) {
                    console.error('Failed to fetch events:', err)
                }
            },
            
            fetchDiscourse: async (passageId: string) => {
                try {
                    const { bhsaAPI } = await import('../services/api')
                    const discourse = await bhsaAPI.getDiscourse(passageId)
                    set({ discourse })
                } catch (err) {
                    console.error('Failed to fetch discourse:', err)
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
                bhsaLoaded: state.bhsaLoaded,
                // Convert Sets to arrays for persistence
                validated: {
                    participants: Array.from(state.validated.participants),
                    relations: Array.from(state.validated.relations),
                    events: Array.from(state.validated.events),
                    discourse: Array.from(state.validated.discourse),
                },
                checkedClauses: Array.from(state.checkedClauses)
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
                },
                checkedClauses: new Set(persisted?.checkedClauses || [])
            })
        }
    )
)
