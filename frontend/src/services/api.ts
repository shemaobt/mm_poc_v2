/**
 * API Client for backend communication
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add JWT token to requests
const TOKEN_KEY = 'mm_auth_token'

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ============================================================
// TYPES
// ============================================================

export interface User {
    id: string
    username: string
    email: string
    roles: string[]
    isApproved: boolean
    createdAt: string
}

export interface TokenResponse {
    access_token: string
    token_type: string
}

// ============================================================
// AUTH API
// ============================================================

export const authAPI = {
    signup: async (username: string, email: string, password: string): Promise<User> => {
        const response = await apiClient.post('/api/auth/signup', { username, email, password })
        return response.data
    },

    login: async (username: string, password: string): Promise<TokenResponse> => {
        const response = await apiClient.post('/api/auth/login', { username, password })
        return response.data
    },

    me: async (): Promise<User> => {
        const response = await apiClient.get('/api/auth/me')
        return response.data
    },
}

// ============================================================
// USERS API (Admin only)
// ============================================================

export const usersAPI = {
    list: async (): Promise<{ users: User[] }> => {
        const response = await apiClient.get('/api/users')
        return response.data
    },

    approve: async (userId: string) => {
        const response = await apiClient.put(`/api/users/${userId}/approve`)
        return response.data
    },

    reject: async (userId: string) => {
        const response = await apiClient.put(`/api/users/${userId}/reject`)
        return response.data
    },

    updateRoles: async (userId: string, roles: string[]) => {
        const response = await apiClient.put(`/api/users/${userId}/role`, { roles })
        return response.data
    },

    delete: async (userId: string) => {
        const response = await apiClient.delete(`/api/users/${userId}`)
        return response.data
    },
}

// ============================================================
// BHSA API
// ============================================================

export const bhsaAPI = {
    // Participants
    getParticipants: async (passageId: string) => {
        const response = await apiClient.get(`/api/passages/${passageId}/participants`)
        return response.data
    },
    createParticipant: async (passageId: string, data: any) => { // Assuming 'any' for data type as ParticipantCreate is not defined
        const response = await apiClient.post(`/api/passages/${passageId}/participants`, data)
        return response.data
    },
    updateParticipant: async (id: string, data: any) => { // Assuming 'any' for data type as ParticipantCreate is not defined
        const response = await apiClient.put(`/api/participants/${id}`, data)
        return response.data
    },
    deleteParticipant: async (id: string) => {
        const response = await apiClient.delete(`/api/participants/${id}`)
        return response.data
    },

    // Relations
    getRelations: async (passageId: string) => {
        const response = await apiClient.get(`/api/passages/${passageId}/relations`)
        return response.data
    },
    createRelation: async (passageId: string, data: any) => {
        const response = await apiClient.post(`/api/passages/${passageId}/relations`, data)
        return response.data
    },
    updateRelation: async (id: string, data: any) => {
        const response = await apiClient.put(`/api/relations/${id}`, data)
        return response.data
    },
    deleteRelation: async (id: string) => {
        const response = await apiClient.delete(`/api/relations/${id}`)
        return response.data
    },

    // Events
    getEvents: async (passageId: string) => {
        const response = await apiClient.get(`/api/passages/${passageId}/events`)
        return response.data
    },
    createEvent: async (passageId: string, data: any) => {
        const response = await apiClient.post(`/api/passages/${passageId}/events`, data)
        return response.data
    },
    updateEvent: async (id: string, data: any) => {
        const response = await apiClient.put(`/api/events/${id}`, data)
        return response.data
    },
    patchEvent: async (id: string, delta: any) => {
        const response = await apiClient.patch(`/api/events/${id}`, delta)
        return response.data
    },
    deleteEvent: async (id: string) => {
        const response = await apiClient.delete(`/api/events/${id}`)
        return response.data
    },

    // Discourse
    getDiscourse: async (passageId: string) => {
        const response = await apiClient.get(`/api/passages/${passageId}/discourse`)
        return response.data
    },
    createDiscourse: async (passageId: string, data: any) => {
        const response = await apiClient.post(`/api/passages/${passageId}/discourse`, data)
        return response.data
    },
    updateDiscourse: async (id: string, data: any) => {
        const response = await apiClient.put(`/api/discourse/${id}`, data)
        return response.data
    },
    deleteDiscourse: async (id: string) => {
        const response = await apiClient.delete(`/api/discourse/${id}`)
        return response.data
    },

    // AI
    aiPrefill: async (formattedRef: string, apiKey: string) => {
        const response = await apiClient.post('/api/ai/prefill', {
            passage_ref: formattedRef,
            api_key: apiKey
        })
        return response.data
    },

    aiPhase1: async (formattedRef: string, apiKey: string) => {
        const response = await apiClient.post('/api/ai/analyze/phase1', {
            passage_ref: formattedRef,
            api_key: apiKey
        })
        return response.data
    },

    aiPhase2: async (formattedRef: string, apiKey: string) => {
        const response = await apiClient.post('/api/ai/analyze/phase2', {
            passage_ref: formattedRef,
            api_key: apiKey
        })
        return response.data
    },

    translateClauses: async (reference: string, apiKey: string) => {
        const response = await apiClient.post('/api/ai/translate_clauses', {
            reference: reference, // Matches AIAnalysisRequest schema
            api_key: apiKey // Not used in request model but potentially good for consistency
        })
        return response.data
    },

    // BHSA
    getStatus: async () => {
        const response = await apiClient.get('/api/bhsa/status')
        return response.data
    },

    loadBHSA: async () => {
        const response = await apiClient.post('/api/bhsa/load')
        return response.data
    },

    fetchPassage: async (reference: string, skipTranslate: boolean = false) => {
        const response = await apiClient.get('/api/bhsa/passage', {
            params: { ref: reference, skip_translate: skipTranslate },
        })
        return response.data
    },
}

// ============================================================
// PASSAGES API
// ============================================================

export const passagesAPI = {
    list: async () => {
        const response = await apiClient.get('/api/passages')
        return response.data
    },

    get: async (id: string) => {
        const response = await apiClient.get(`/api/passages/${id}`)
        return response.data
    },

    create: async (data: any) => {
        const response = await apiClient.post('/api/passages', data)
        return response.data
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/api/passages/${id}`)
        return response.data
    },
}

// ============================================================
// PERICOPES API
// ============================================================

export interface LockInfo {
    pericopeRef: string
    userId: string
    userName: string
    startedAt: string
    lastActivity: string
}

export interface Pericope {
    id: string
    reference: string
    book: string
    chapterStart: number
    verseStart: number
    chapterEnd: number | null
    verseEnd: number | null
    lock: LockInfo | null
}

export interface PericopeLockInfo {
    pericopeRef: string
    startedAt: string
    lastActivity: string
}

export interface UserProgress {
    id: string
    username: string
    email: string
    role: string
    completedPassages: number
    inProgressPassages: number
    currentLocks: PericopeLockInfo[]
}

export const pericopesAPI = {
    list: async (params?: { book?: string; search?: string; limit?: number }): Promise<Pericope[]> => {
        const response = await apiClient.get('/api/pericopes', { params })
        return response.data
    },

    getBooks: async (): Promise<string[]> => {
        const response = await apiClient.get('/api/pericopes/books')
        return response.data
    },

    // Lock management
    lock: async (reference: string) => {
        const response = await apiClient.post(`/api/pericopes/lock/${encodeURIComponent(reference)}`)
        return response.data
    },

    unlock: async (reference: string) => {
        const response = await apiClient.delete(`/api/pericopes/lock/${encodeURIComponent(reference)}`)
        return response.data
    },

    heartbeat: async (reference: string) => {
        const response = await apiClient.put(`/api/pericopes/lock/${encodeURIComponent(reference)}/heartbeat`)
        return response.data
    },

    getLocks: async (): Promise<LockInfo[]> => {
        const response = await apiClient.get('/api/pericopes/locks')
        return response.data
    },

    // Admin-only bulk operations
    resetAllLocks: async () => {
        const response = await apiClient.delete('/api/pericopes/locks/all')
        return response.data
    },

    deleteAllPassages: async () => {
        const response = await apiClient.delete('/api/pericopes/passages/all')
        return response.data
    },

    resetEverything: async () => {
        const response = await apiClient.delete('/api/pericopes/reset/all')
        return response.data
    },
}

// ============================================================
// USER PROGRESS API (Admin only)
// ============================================================

export const userProgressAPI = {
    getProgress: async (): Promise<{ users: UserProgress[] }> => {
        const response = await apiClient.get('/api/users/progress')
        return response.data
    },
}

// ============================================================
// EXPORT API (Tripod v5.2)
// ============================================================

export const mapsAPI = {
    // List all completed meaning maps
    listCompleted: async () => {
        const response = await apiClient.get('/api/maps')
        return response.data
    },

    // Export a passage as Tripod v5.2 JSON
    exportPassage: async (passageId: string) => {
        const response = await apiClient.get(`/api/maps/${passageId}/export`)
        return response.data
    },

    // Mark a passage as complete
    finalizePassage: async (passageId: string) => {
        const response = await apiClient.post(`/api/maps/${passageId}/finalize`)
        return response.data
    },
}

// ============================================================
// METRICS API
// ============================================================

export interface MetricsFilter {
    time_range?: 'today' | 'week' | 'month' | 'all'
    start_date?: string  // YYYY-MM-DD
    end_date?: string    // YYYY-MM-DD
}

export const metricsAPI = {
    createSnapshot: async (passageId: string, snapshotData: any) => {
        const response = await apiClient.post('/api/metrics/snapshot', {
            passage_id: passageId,
            snapshot_data: snapshotData
        })
        return response.data
    },

    logEdit: async (snapshotId: string, action: string, entityType: string, entityId: string,
        fieldName?: string, oldValue?: any, newValue?: any, isAiGenerated: boolean = false) => {
        const response = await apiClient.post('/api/metrics/log', {
            snapshot_id: snapshotId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            field_name: fieldName,
            old_value: oldValue,
            new_value: newValue,
            is_ai_generated: isAiGenerated
        })
        return response.data
    },

    getAggregateMetrics: async (filter?: MetricsFilter) => {
        const params: Record<string, string> = {}
        if (filter?.time_range && filter.time_range !== 'all') {
            params.time_range = filter.time_range
        }
        if (filter?.start_date) {
            params.start_date = filter.start_date
        }
        if (filter?.end_date) {
            params.end_date = filter.end_date
        }
        const response = await apiClient.get('/api/metrics/aggregate', { params })
        return response.data
    }
}

export default apiClient
