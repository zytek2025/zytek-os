'use client'
import { useState, useEffect } from 'react'
import type { AdminSession } from '@/types/admin'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

interface PoolModifier {
  id: string
  nombre: string
  emoji: string
  tipo: 'contorno' | 'extra' | 'sin'
  precio: number
}

interface ForcedCfg {
  enabled: boolean
  label: string
  maxSelections: number
  modifierIds: string[]
}

interface ItemModsCfg {
  itemId: string
  forcedModifiers: ForcedCfg | null
  extrasModifierIds: string[]
  sinModifierIds: string[]
}

interface MenuItemLite {
  id: string
  nombre: string
  emoji: string
  groupId: string
  subgroupId: string | null
  precio: number
}

const LS_POOL = 'zytek:pool-modifiers'
const LS_ITEMS = 'zytek:menu-items'
const LS_MODCFG = 'zytek:item-mods-cfg'

const SEED_ITEMS: MenuItemLite[] = [
  { id: 'piz-mar-med', nombre: 'Pizza Margarita', emoji: '🍕', groupId: 'pizzas',       subgroupId: 'sg-piz-med', precio: 18 },
  { id: 'piz-pep-med', nombre: 'Pizza Pepperoni', emoji: '🍕', groupId: 'pizzas',       subgroupId: 'sg-piz-med', precio: 20 },
  { id: 'ham-cla-sen', nombre: 'Burger Clásica',  emoji: '🍔', groupId: 'hamburguesas', subgroupId: 'sg-ham-sen', precio: 15 },
  { id: 'ham-cla-dob', nombre: 'Burger Clásica',  emoji: '🍔', groupId: 'hamburguesas', subgroupId: 'sg-ham-dob', precio: 20 },
  { id: 'car-bis',     nombre: 'Bisteck Plancha', emoji: '🥩', groupId: 'carnes',       subgroupId: null,         precio: 22 },
  { id: 'ent-cesar',   nombre: 'Ensalada César',  emoji: '🥗', groupId: 'entradas',     subgroupId: null,         precio: 14 },
]

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

export function ModGruposSec({ showToast }: Props) {
  const [pool, setPool] = useState<PoolModifier[]>([])
  const [items, setItems] = useState<MenuItemLite[]>([])
  const [cfgs, setCfgs] = useState<Record<string, ItemModsCfg>>({})
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    setPool(readLS<PoolModifier[]>(LS_POOL, []))
    const its = readLS<MenuItemLite[]>(LS_ITEMS, SEED_ITEMS)
    setItems(its)
    setCfgs(readLS<Record<string, ItemModsCfg>>(LS_MODCFG, {}))
    if (its[0]) setSelectedId(its[0].id)
  }, [])

  const contornos = pool.filter(m => m.tipo === 'contorno')
  const extras    = pool.filter(m => m.tipo === 'extra')
  const sins      = pool.filter(m => m.tipo === 'sin')

  const selected = items.find(i => i.id === selectedId) || null
  const cfg: ItemModsCfg = cfgs[selectedId] || {
    itemId: selectedId,
    forcedModifiers: null,
    extrasModifierIds: [],
    sinModifierIds: [],
  }

  const updateCfg = (patch: Partial<ItemModsCfg>) => {
    setCfgs(prev => {
      const next = { ...prev, [selectedId]: { ...cfg, ...patch, itemId: selectedId } }
      writeLS(LS_MODCFG, next)
      return next
    })
  }

  const toggleForcedEnabled = (on: boolean) => {
    if (on) {
      updateCfg({
        forcedModifiers: cfg.forcedModifiers ?? { enabled: true, label: 'Contornos', maxSelections: 1, modifierIds: [] },
      })
    } else {
      updateCfg({ forcedModifiers: null })
    }
  }

  const setForced = (patch: Partial<ForcedCfg>) => {
    if (!cfg.forcedModifiers) return
    updateCfg({ forcedModifiers: { ...cfg.forcedModifiers, ...patch } })
  }

  const toggleIdInList = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  const save = () => {
    writeLS(LS_MODCFG, cfgs)
    showToast('✅ Asignaciones guardadas')
  }

  const resetItem = () => {
    if (!confirm('¿Quitar todas las asignaciones de este plato?')) return
    setCfgs(prev => {
      const next = { ...prev }
      delete next[selectedId]
      writeLS(LS_MODCFG, next)
      return next
    })
  }

  const ModPicker = ({
    title, list, selectedIds, onToggle,
  }: {
    title: string
    list: PoolModifier[]
    selectedIds: string[]
    onToggle: (id: string) => void
  }) => (
    <div className="fgroup full">
      <label className="flabel">{title} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({selectedIds.length} seleccionados)</span></label>
      {list.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, padding: '8px 10px' }}>
          No hay modificadores de este tipo en el pool. Crea algunos en "Pool de Modificadores".
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
          {list.map(m => {
            const on = selectedIds.includes(m.id)
            return (
              <div
                key={m.id}
                onClick={() => onToggle(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: on ? 'var(--green-dim, #0a3a1e)' : 'var(--surface2)',
                  border: `1px solid ${on ? 'var(--green-b, #2ee87a)' : 'var(--border)'}`,
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 14 }}>{m.emoji}</span>
                <span style={{ flex: 1, color: 'var(--text)' }}>{m.nombre}</span>
                {m.precio > 0 && <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--orange)', fontSize: 10 }}>+${m.precio.toFixed(2)}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const forcedList = cfg.forcedModifiers ? contornos.filter(m => cfg.forcedModifiers!.modifierIds.includes(m.id)) : []
  const extrasPreview = extras.filter(m => cfg.extrasModifierIds.includes(m.id))
  const sinPreview = sins.filter(m => cfg.sinModifierIds.includes(m.id))

  return (
    <>
      <div className="page-title">Asignar Modificadores a Platos</div>
      <div className="page-sub">Elige un plato y configura sus contornos obligatorios, extras y opciones "sin…"</div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
        {/* Items list */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head">
            <div>
              <div className="card-title">Platos</div>
              <div className="card-sub">{items.length}</div>
            </div>
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {items.map(it => {
              const has = !!cfgs[it.id]
              const active = selectedId === it.id
              return (
                <div
                  key={it.id}
                  onClick={() => setSelectedId(it.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', cursor: 'pointer',
                    background: active ? 'var(--surface2)' : 'transparent',
                    borderLeft: `3px solid ${active ? 'var(--orange)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{it.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{it.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>
                      {it.groupId}{it.subgroupId ? ` · ${it.subgroupId}` : ''} · ${it.precio.toFixed(2)}
                    </div>
                  </div>
                  {has && <span className="badge b-green" style={{ fontSize: 9 }}>MOD</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="card">
          {!selected ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Selecciona un plato</div>
          ) : (
            <>
              <div className="card-head">
                <div>
                  <div className="card-title">{selected.emoji} {selected.nombre}</div>
                  <div className="card-sub">${selected.precio.toFixed(2)} · {selected.groupId}{selected.subgroupId ? ` › ${selected.subgroupId}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={resetItem}>🗑️ Limpiar</button>
                  <button className="btn btn-primary btn-sm" onClick={save}>💾 Guardar</button>
                </div>
              </div>

              <div className="fgrid">
                {/* Forced / Contornos */}
                <div className="fgroup full">
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 10, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Contornos obligatorios</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Si está activo, el POS forzará al menos 1 selección</div>
                    </div>
                    <div className={`sw ${cfg.forcedModifiers?.enabled ? 'on' : ''}`} onClick={() => toggleForcedEnabled(!cfg.forcedModifiers?.enabled)} />
                  </div>
                </div>

                {cfg.forcedModifiers?.enabled && (
                  <>
                    <div className="fgroup">
                      <label className="flabel">Etiqueta</label>
                      <input
                        className="finput"
                        value={cfg.forcedModifiers.label}
                        onChange={(e) => setForced({ label: e.target.value })}
                        placeholder="Contornos"
                      />
                    </div>
                    <div className="fgroup">
                      <label className="flabel">Máx. selecciones (0 = ilimitado)</label>
                      <input
                        className="finput"
                        type="number"
                        min={0}
                        value={cfg.forcedModifiers.maxSelections}
                        onChange={(e) => setForced({ maxSelections: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <ModPicker
                      title="Contornos disponibles"
                      list={contornos}
                      selectedIds={cfg.forcedModifiers.modifierIds}
                      onToggle={(id) => setForced({ modifierIds: toggleIdInList(cfg.forcedModifiers!.modifierIds, id) })}
                    />
                  </>
                )}

                <ModPicker
                  title="Extras"
                  list={extras}
                  selectedIds={cfg.extrasModifierIds}
                  onToggle={(id) => updateCfg({ extrasModifierIds: toggleIdInList(cfg.extrasModifierIds, id) })}
                />

                <ModPicker
                  title="Sin…"
                  list={sins}
                  selectedIds={cfg.sinModifierIds}
                  onToggle={(id) => updateCfg({ sinModifierIds: toggleIdInList(cfg.sinModifierIds, id) })}
                />

                {/* Preview */}
                <div className="fgroup full">
                  <label className="flabel">Vista previa en el POS</label>
                  <div style={{ padding: 10, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                    {cfg.forcedModifiers?.enabled && forcedList.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>
                          {cfg.forcedModifiers.label.toUpperCase()} — elige hasta {cfg.forcedModifiers.maxSelections || '∞'}
                        </div>
                        <div style={{ color: 'var(--text)' }}>{forcedList.map(m => `${m.emoji} ${m.nombre}`).join(' · ')}</div>
                      </div>
                    )}
                    {extrasPreview.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>EXTRAS</div>
                        <div style={{ color: 'var(--text)' }}>{extrasPreview.map(m => `${m.emoji} ${m.nombre}${m.precio > 0 ? ` +$${m.precio.toFixed(2)}` : ''}`).join(' · ')}</div>
                      </div>
                    )}
                    {sinPreview.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>SIN…</div>
                        <div style={{ color: 'var(--text)' }}>{sinPreview.map(m => `${m.emoji} ${m.nombre}`).join(' · ')}</div>
                      </div>
                    )}
                    {!cfg.forcedModifiers?.enabled && extrasPreview.length === 0 && sinPreview.length === 0 && (
                      <div style={{ color: 'var(--text-dim)' }}>Sin modificadores — el POS saltará el paso.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default ModGruposSec
