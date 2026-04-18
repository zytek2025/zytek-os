'use client'
import { useState, useEffect } from 'react'
import { idbGetAll } from '@/lib/idb.client'

export type ConnectionStatus = 'online' | 'offline' | 'degraded' | 'syncing'

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('online')
  const [pendingOps, setPendingOps] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setStatus('online')
    const handleOffline = () => setStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (!navigator.onLine) setStatus('offline')

    // Count pending sync ops every 3 seconds
    const checkPending = setInterval(async () => {
      try {
        const queue = await idbGetAll('sync_queue')
        setPendingOps(queue.length)
        if (queue.length > 0 && navigator.onLine) {
          setStatus('syncing')
        } else if (navigator.onLine) {
          setStatus('online')
        }
      } catch {
        // IDB not ready yet
      }
    }, 3000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(checkPending)
    }
  }, [])

  return { status, pendingOps }
}
