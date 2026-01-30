import { useState, useRef, useCallback, useEffect } from 'react'
import { pericopesAPI } from '../../../../services/api'
import { toast } from 'sonner'

export function usePericopeLock() {
    const [currentLock, setCurrentLock] = useState<string | null>(null)
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const acquireLock = useCallback(async (ref: string): Promise<boolean> => {
        try {
            await pericopesAPI.lock(ref)
            setCurrentLock(ref)

            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
            }
            heartbeatRef.current = setInterval(async () => {
                try {
                    await pericopesAPI.heartbeat(ref)
                } catch (err) {
                    console.error('Heartbeat failed:', err)
                }
            }, 30000)

            return true
        } catch (err: any) {
            if (err.response?.status === 409) {
                const detail = err.response?.data?.detail
                toast.error('Pericope Locked', {
                    description: detail?.message || 'This pericope is being analyzed by another user'
                })
            } else {
                console.error('Failed to acquire lock:', err)
            }
            return false
        }
    }, [])

    const releaseLock = useCallback(async (ref?: string) => {
        const refToRelease = ref || currentLock
        if (!refToRelease) return

        try {
            await pericopesAPI.unlock(refToRelease)
        } catch (err) {
            console.error('Failed to release lock:', err)
        } finally {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
                heartbeatRef.current = null
            }
            setCurrentLock(null)
        }
    }, [currentLock])

    const startHeartbeat = useCallback((ref: string) => {
        setCurrentLock(ref)
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current)
        }
        heartbeatRef.current = setInterval(async () => {
            try {
                await pericopesAPI.heartbeat(ref)
            } catch (err) {
                console.error('Heartbeat failed:', err)
            }
        }, 30000)
    }, [])

    useEffect(() => {
        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
            }
        }
    }, [])

    return {
        currentLock,
        setCurrentLock,
        acquireLock,
        releaseLock,
        startHeartbeat
    }
}
