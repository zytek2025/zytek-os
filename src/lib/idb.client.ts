// ============================================================
//  IndexedDB Client - offline-first storage
//  Mismo esquema que zytek-core.js, pero en TypeScript
//  Solo se usa en componentes client-side
// ============================================================
import type { Venta, Cliente, InvItem, InvMovimiento } from '@/types'
import { EventBus } from '@/lib/eventbus.client'

const DB_NAME    = 'zytek_v2'
const DB_VERSION = 4

let _db: IDBDatabase | null = null

export async function openIDB(): Promise<IDBDatabase> {
  if (_db) return _db
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      const stores = [
        { name: 'transacciones',    key: 'id', indices: [{ name: 'turnoId', field: 'turnoId' }, { name: 'ts', field: 'ts' }] },
        { name: 'sync_queue',       key: 'id', indices: [{ name: 'turnoId', field: 'turnoId' }, { name: 'modulo', field: 'modulo' }] },
        { name: 'config',           key: 'key' },
        { name: 'cortes_z',         key: 'id' },
        { name: 'clientes',         key: 'id', indices: [{ name: 'nombre', field: 'nombre' }] },
        { name: 'productos',        key: 'id', indices: [{ name: 'cat', field: 'cat' }] },
        { name: 'inventario',       key: 'id' },
        { name: 'events',           key: 'id' },
        { name: 'fintrack_tx',      key: 'id', indices: [{ name: 'tipo', field: 'tipo' }, { name: 'fecha', field: 'fecha' }] },
        { name: 'pos_orders',       key: 'id', indices: [{ name: 'tenant_id', field: 'tenant_id' }, { name: 'status', field: 'status' }] },
        { name: 'pos_order_items',  key: 'id', indices: [{ name: 'order_id', field: 'order_id' }] },
      ]
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, { keyPath: s.key })
          for (const idx of s.indices || []) store.createIndex(idx.name, idx.field, { unique: false })
        }
      }
    }
    req.onsuccess  = e => { _db = (e.target as IDBOpenDBRequest).result; res(_db) }
    req.onerror    = () => rej(req.error)
  })
}

export async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => res(req.result ?? null)
    req.onerror   = () => rej(req.error)
  })
}

export async function idbPut(store: string, obj: unknown): Promise<void> {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(obj)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}

export async function idbGetAll<T>(store: string, indexName?: string, value?: unknown): Promise<T[]> {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly')
    const s  = tx.objectStore(store)
    const req = (indexName && value !== undefined)
      ? s.index(indexName).getAll(value as IDBValidKey)
      : s.getAll()
    req.onsuccess = () => res(req.result ?? [])
    req.onerror   = () => rej(req.error)
  })
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}

export async function idbDeleteByIndex(store: string, indexName: string, value: unknown): Promise<number> {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readwrite')
    const idx = tx.objectStore(store).index(indexName)
    const req = idx.openCursor(IDBKeyRange.only(value as IDBValidKey))
    let n = 0
    req.onsuccess = e => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) { cursor.delete(); n++; cursor.continue() } else res(n)
    }
    req.onerror = () => rej(req.error)
  })
}

// -- Sync queue helpers -------------------------------------------
export async function enqueueSync(modulo: string, tabla: string, op: 'upsert' | 'delete', data: unknown, turnoId = 'T0') {
  await idbPut('sync_queue', {
    id: `sq${Date.now()}${Math.random().toString(36).slice(2,5)}`,
    modulo, tabla, op, data, turnoId,
    ts: Date.now(), intentos: 0
  })
  // Notifica al SyncService (y consumidores UI del badge) que hay trabajo nuevo.
  // Guardado por typeof window porque idb.client.ts puede importarse desde SSR.
  if (typeof window !== 'undefined') {
    try { EventBus.emit('sync.queued', { modulo, tabla, op }) } catch {}
  }
}

// -- Storage persistence ------------------------------------------
export async function requestPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

export async function storageHealth() {
  const persistent = await navigator.storage?.persisted?.() ?? false
  let quota = null
  if (navigator.storage?.estimate) {
    const e = await navigator.storage.estimate()
    quota = { used: e.usage ?? 0, total: e.quota ?? 0, pct: Math.round((e.usage ?? 0) / (e.quota ?? 1) * 100) }
  }
  return { persistent, quota }
}
