// ─────────────────────────────────────────────────────────────
// ZytekOS · SyncService — drena la cola offline de IndexedDB
// hacia /api/sync. Servicio imperativo singleton: corre un ciclo
// cada SYNC_INTERVAL_MS, ademas al reconectar y al arrancar.
// Archivo: src/services/sync-service.ts
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/lib/supabase.client'
import { idbGetAll, idbDelete } from '@/lib/idb.client'
import { EventBus } from '@/lib/eventbus.client'

export const SYNC_INTERVAL_MS = 30_000

interface SyncQueueItem {
  id: string
  modulo: string
  tabla: string
  op: 'upsert' | 'delete'
  data: unknown
  turnoId?: string
  ts?: number
  intentos?: number
}

interface SyncResultItem {
  id: string
  ok: boolean
  error?: string
}

interface SyncResponseBody {
  ok?: boolean
  processed?: number
  failed?: number
  total?: number
  results?: SyncResultItem[]
  error?: string
}

let cycleHandle: ReturnType<typeof setInterval> | null = null
let onlineHandler: (() => void) | null = null
let flushing = false
let lastSyncAt: number | null = null

async function flushOnce(): Promise<void> {
  if (flushing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const queue = await idbGetAll<SyncQueueItem>('sync_queue')
  if (!queue.length) return

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return

  flushing = true
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ operations: queue }),
    })

    if (!res.ok) {
      console.warn(`[SyncService] HTTP ${res.status} al flushear`, await safeReadText(res))
      return
    }

    const data = (await res.json()) as SyncResponseBody

    if (!data.ok) {
      console.warn('[SyncService] Respuesta del servidor !ok', data.error ?? data)
      return
    }

    const results = data.results ?? []
    const failures: SyncResultItem[] = []

    for (const r of results) {
      if (r.ok) {
        await idbDelete('sync_queue', r.id)
      } else {
        failures.push(r)
      }
    }

    if (failures.length) {
      console.warn(
        `[SyncService] ${failures.length}/${results.length} ops fallaron (se reintentan en proximo ciclo)`,
        failures.slice(0, 5),
      )
    }

    const processed = data.processed ?? results.filter(r => r.ok).length
    if (processed > 0) {
      lastSyncAt = Date.now()
    }

    EventBus.emit('sync.flushed', {
      processed,
      failed: data.failed ?? failures.length,
      total: data.total ?? results.length,
      lastSyncAt,
    })
  } catch (err) {
    console.warn('[SyncService] Error de red durante flush', err)
  } finally {
    flushing = false
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export async function getPending(): Promise<number> {
  const q = await idbGetAll('sync_queue')
  return q.length
}

export function getLastSync(): Date | null {
  return lastSyncAt ? new Date(lastSyncAt) : null
}

export const SyncService = {
  /**
   * Arranca el ciclo de sync. Idempotente: llamadas posteriores mientras
   * ya hay un ciclo activo son no-ops. Devuelve una funcion stop del
   * ciclo propio; si no era el llamante que arranco el ciclo, es noop.
   */
  startSyncCycle: (): (() => void) => {
    if (cycleHandle !== null) {
      return () => {
        /* noop: otro caller es duenio del ciclo activo */
      }
    }

    // Flush inmediato al arrancar (no bloquea; errores van a console.warn)
    void flushOnce()

    cycleHandle = setInterval(() => {
      void flushOnce()
    }, SYNC_INTERVAL_MS)

    onlineHandler = () => {
      void flushOnce()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onlineHandler)
    }

    return () => SyncService.stopSyncCycle()
  },

  stopSyncCycle: (): void => {
    if (cycleHandle !== null) {
      clearInterval(cycleHandle)
      cycleHandle = null
    }
    if (onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', onlineHandler)
    }
    onlineHandler = null
  },

  /** Flush manual (para triggers UI); respeta el mutex flushing. */
  flush: flushOnce,

  getPending,
  getLastSync,
}
