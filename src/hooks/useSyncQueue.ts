'use client'
import { useState, useEffect, useCallback } from 'react'
import { idbGetAll, idbDelete }             from '@/lib/idb.client'
import { EventBus }                         from '@/lib/eventbus.client'

export function useSyncQueue(token: string | null) {
  const [pending,  setPending]  = useState(0)
  const [syncing,  setSyncing]  = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const check = async () => {
      const q = await idbGetAll('sync_queue')
      setPending(q.length)
    }
    check()
    const unsub = EventBus.on('sync.queued', () => check())
    const done  = EventBus.on('sync.completed', () => { check(); setLastSync(new Date()) })
    return () => { unsub(); done() }
  }, [])

  const flush = useCallback(async () => {
    if (!token || !navigator.onLine || syncing) return
    setSyncing(true)
    try {
      const queue = await idbGetAll<any>('sync_queue')
      if (!queue.length) return
      const res = await fetch('/api/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ operations: queue }),
      })
      const data = await res.json()
      if (data.ok) {
        // Remove processed operations from IDB
        for (const r of (data.results || [])) {
          if (r.ok) await idbDelete('sync_queue', r.id)
        }
        const remaining = await idbGetAll('sync_queue')
        setPending(remaining.length)
        setLastSync(new Date())
        EventBus.emit('sync.flushed', { processed: data.processed, total: data.total })
      }
    } finally {
      setSyncing(false)
    }
  }, [token, syncing])

  // Auto-flush when back online
  useEffect(() => {
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [flush])

  return { pending, syncing, lastSync, flush }
}
