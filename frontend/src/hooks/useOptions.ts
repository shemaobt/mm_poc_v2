/**
 * useOptions Hook
 * Fetches and caches dynamic dropdown options from the backend.
 * Provides createOption function for adding new options.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { optionsAPI, FieldOption } from '../services/api'

// In-memory cache for options (shared across all instances)
const optionsCache: Map<string, FieldOption[]> = new Map()
const cacheTimestamps: Map<string, number> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface UseOptionsResult {
    options: FieldOption[]
    loading: boolean
    error: string | null
    createOption: (value: string, label?: string) => Promise<FieldOption | null>
    refresh: () => Promise<void>
}

export function useOptions(category: string): UseOptionsResult {
    const [options, setOptions] = useState<FieldOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fetchingRef = useRef(false)

    const fetchOptions = useCallback(async (forceRefresh = false) => {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedOptions = optionsCache.get(category)
            const cacheTime = cacheTimestamps.get(category)
            
            if (cachedOptions && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
                setOptions(cachedOptions)
                setLoading(false)
                return
            }
        }

        // Prevent concurrent fetches for the same category
        if (fetchingRef.current) return
        fetchingRef.current = true

        try {
            setLoading(true)
            setError(null)
            const data = await optionsAPI.list(category)
            
            // Update cache
            optionsCache.set(category, data)
            cacheTimestamps.set(category, Date.now())
            
            setOptions(data)
        } catch (err) {
            console.error(`Failed to fetch options for ${category}:`, err)
            setError(err instanceof Error ? err.message : 'Failed to fetch options')
            
            // Fall back to cached options if available
            const cachedOptions = optionsCache.get(category)
            if (cachedOptions) {
                setOptions(cachedOptions)
            }
        } finally {
            setLoading(false)
            fetchingRef.current = false
        }
    }, [category])

    useEffect(() => {
        fetchOptions()
    }, [fetchOptions])

    const createOption = useCallback(async (value: string, label?: string): Promise<FieldOption | null> => {
        try {
            const newOption = await optionsAPI.create(category, value, label)
            
            // Update local state and cache
            const updatedOptions = [...options, newOption]
            setOptions(updatedOptions)
            optionsCache.set(category, updatedOptions)
            cacheTimestamps.set(category, Date.now())
            
            return newOption
        } catch (err: any) {
            // Handle duplicate error gracefully
            if (err?.response?.status === 409) {
                // Option already exists, try to find it in current options
                const existing = options.find(o => o.value === value)
                if (existing) return existing
                
                // Refresh to get the existing option
                await fetchOptions(true)
                const refreshed = optionsCache.get(category)
                return refreshed?.find(o => o.value === value) || null
            }
            
            console.error(`Failed to create option:`, err)
            throw err
        }
    }, [category, options, fetchOptions])

    const refresh = useCallback(async () => {
        await fetchOptions(true)
    }, [fetchOptions])

    return { options, loading, error, createOption, refresh }
}

/**
 * Helper function to clear all cached options
 * Useful after bulk updates or when switching users
 */
export function clearOptionsCache() {
    optionsCache.clear()
    cacheTimestamps.clear()
}

/**
 * Helper function to clear cache for a specific category
 */
export function clearCategoryCache(category: string) {
    optionsCache.delete(category)
    cacheTimestamps.delete(category)
}
