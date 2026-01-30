import { useState, useEffect, useCallback, useRef } from 'react'
import { optionsAPI, FieldOption } from '../services/api'

const optionsCache: Map<string, FieldOption[]> = new Map()
const cacheTimestamps: Map<string, number> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

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
        if (!forceRefresh) {
            const cachedOptions = optionsCache.get(category)
            const cacheTime = cacheTimestamps.get(category)
            
            if (cachedOptions && cacheTime && Date.now() - cacheTime < CACHE_TTL_MS) {
                setOptions(cachedOptions)
                setLoading(false)
                return
            }
        }

        if (fetchingRef.current) return
        fetchingRef.current = true

        try {
            setLoading(true)
            setError(null)
            const data = await optionsAPI.list(category)
            
            optionsCache.set(category, data)
            cacheTimestamps.set(category, Date.now())
            
            setOptions(data)
        } catch (err) {
            console.error(`Failed to fetch options for ${category}:`, err)
            setError(err instanceof Error ? err.message : 'Failed to fetch options')
            
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
            
            const updatedOptions = [...options, newOption]
            setOptions(updatedOptions)
            optionsCache.set(category, updatedOptions)
            cacheTimestamps.set(category, Date.now())
            
            return newOption
        } catch (err: any) {
            if (err?.response?.status === 409) {
                const existing = options.find(o => o.value === value)
                if (existing) return existing
                
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
