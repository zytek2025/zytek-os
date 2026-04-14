// ═══════════════════════════════════════════════════════════════
//  Supabase Realtime — client subscriptions
//  Escucha cambios en la BD en tiempo real
//  Se usa para sincronizar datos entre módulos vía Supabase
// ═══════════════════════════════════════════════════════════════
import { supabase } from './supabase.client'
import { EventBus } from './eventbus.client'

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

type RealtimeHandler = (payload: RealtimePayload) => void

export const RealtimeService = {
  _channels: new Map<string, ReturnType<typeof supabase.channel>>(),

  subscribe(table: string, tenantId: string, handler: RealtimeHandler) {
    const key = `${table}:${tenantId}`
    if (this._channels.has(key)) return

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          handler(payload as RealtimePayload)
          EventBus.emit(`db.${table}.changed`, payload, 'realtime')
        }
      )
      .subscribe()

    this._channels.set(key, channel)
    return () => this.unsubscribe(table, tenantId)
  },

  unsubscribe(table: string, tenantId: string) {
    const key = `${table}:${tenantId}`
    const ch = this._channels.get(key)
    if (ch) { supabase.removeChannel(ch); this._channels.delete(key) }
  },

  subscribeToSystem(tenantId: string) {
    this.subscribe('ventas', tenantId, (p) => {
      if (p.eventType === 'INSERT') EventBus.emit('venta.nueva', p.new, 'realtime')
    })

    this.subscribe('inventario', tenantId, (p) => {
      if (p.eventType === 'UPDATE') {
        const item = p.new
        if (typeof item.stock === 'number' && typeof item.min === 'number' && item.stock <= item.min) {
          EventBus.emit('stock.alerta', { item: p.new, tipo: 'bajo_minimo' }, 'realtime')
        }
      }
    })

    this.subscribe('cortes_z', tenantId, (p) => {
      if (p.eventType === 'INSERT') EventBus.emit('corte_z.completado', p.new, 'realtime')
    })
  },

  unsubscribeAll() {
    this._channels.forEach(ch => supabase.removeChannel(ch))
    this._channels.clear()
  }
}
