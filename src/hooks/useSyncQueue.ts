'use client'
import { useState, useEffect, useCallback } from 'react'
import { EventBus } from '@/lib/eventbus.client'
import { SyncService, getPending, getLastSync } from '@/services/sync-service'

// Hook delgado para UI: lee estado del SyncService singleton y
// se suscribe a eventos del EventBus para mantener el badge vivo.
// La logica real de flush vive en sync-service.ts.
export function useSyncQueue() {
  const [pending, setPending]   = useState(0)
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const n = await getPending()
      if (cancelled) return
      setPending(n)
      setLastSync(getLastSync())
    }

    refresh()

    const unsubQueued  = EventBus.on('sync.queued',  () => { refresh() })
    const unsubFlushed = EventBus.on('sync.flushed', () => {
      refresh()
      setSyncing(false)
    })

    return () => {
      cancelled = true
      unsubQueued()
      unsubFlushed()
    }
  }, [])

  const flush = useCallback(async () => {
    setSyncing(true)
    try {
      await SyncService.flush()
    } finally {
      setSyncing(false)
    }
  }, [])

  return { pending, syncing, lastSync, flush }
}
