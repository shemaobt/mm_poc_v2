import { create } from 'zustand'
import type { PassageData, ParticipantResponse, RelationResponse, EventResponse, DiscourseRelationResponse } from '../types'

interface AiSnapshotData {
    participants?: ParticipantResponse[]
    relations?: RelationResponse[]
    events?: EventResponse[]
    discourse?: DiscourseRelationResponse[]
}

interface ValidationState {
    participants: Set<string>
    relations: Set<string>
    events: Set<string>
    discourse: Set<string>
}

interface PassageStore {
    passageData: PassageData | null
    readOnly: boolean
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
    checkedClauses: Set<string>

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
    discardSession: () => void
    setAiSnapshot: (data: AiSnapshotData, snapshotId: string) => void
    trackEdit: (action: string, entityType: string, entityId: string, fieldName?: string, oldValue?: unknown, newValue?: unknown, isAiGenerated?: boolean) => Promise<void>
    
    toggleValidation: (stage: keyof ValidationState, id: string) => void
    validateAll: (stage: keyof ValidationState, ids: string[]) => void
    isStageFullyValidated: (stage: keyof ValidationState, ids: string[]) => boolean
    getValidationCount: (stage: keyof ValidationState) => number
    clearValidation: () => void
    
    setCheckedClauses: (clauses: Set<string>) => void
    toggleClauseCheck: (clauseId: string) => void
    
    fetchEvents: (passageId: string) => Promise<void>
    fetchDiscourse: (passageId: string) => Promise<void>
}

import { persist } from 'zustand/middleware'

export const usePassageStore = create<PassageStore>()(
    persist(
        (set, get) => ({
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
            
            discardSession: () => {
                localStorage.removeItem('passage-storage')
                
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
                validated: {
                    participants: Array.from(state.validated.participants),
                    relations: Array.from(state.validated.relations),
                    events: Array.from(state.validated.events),
                    discourse: Array.from(state.validated.discourse),
                },
                checkedClauses: Array.from(state.checkedClauses)
            }),
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
