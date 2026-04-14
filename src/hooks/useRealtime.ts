'use client'
import { useEffect } from 'react'
import { RealtimeService } from '@/lib/realtime.client'
import { EventBus }        from '@/lib/eventbus.client'

export function useRealtime(tenantId: string | null, enabled = true) {
  useEffect(() => {
    if (!tenantId || !enabled) return
    RealtimeService.subscribeToSystem(tenantId)
    return () => RealtimeService.unsubscribeAll()
  }, [tenantId, enabled])
}

export function useRealtimeTable<T>(
  table: string,
  tenantId: string | null,
  onchange: (payload: T) => void
) {
  useEffect(() => {
    if (!tenantId) return
    const unsub = RealtimeService.subscribe(table, tenantId, onchange as any)
    const busUnsub = EventBus.on(`db.${table}.changed`, p => onchange(p as T))
    return () => { unsub?.(); busUnsub() }
  }, [table, tenantId])
}
