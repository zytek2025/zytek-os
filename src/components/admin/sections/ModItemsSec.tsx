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

export interface PoolModifier {
  id: string
  nombre: string
  emoji: string
  tipo: 'contorno' | 'extra' | 'sin'
  precio: number
}

const LS_KEY = 'zytek:pool-modifiers'

const TIPOS: { value: PoolModifier['tipo']; label: string; color: string }[] = [
  { value: 'contorno', label: 'Contorno (obligatorio)', color: 'amber' },
  { value: 'extra',    label: 'Extra (+ precio)',       color: 'green' },
  { value: 'sin',      label: 'Sin... (quitar)',        color: 'red'   },
]

const SEED: PoolModifier[] = [
  { id: 'mod-arroz',       nombre: 'Arroz blanco',    emoji: '🍚',  tipo: 'contorno', precio: 0    },
  { id: 'mod-ensalada',    nombre: 'Ensalada verde',  emoji: '🥗',  tipo: 'contorno', precio: 0    },
  { id: 'mod-papas',       nombre: 'Papas fritas',    emoji: '🍟',  tipo: 'contorno', precio: 1    },
  { id: 'mod-yuca',        nombre: 'Yuca frita',      emoji: '🥔',  tipo: 'contorno', precio: 0    },
  { id: 'mod-aros',        nombre: 'Aros de cebolla', emoji: '🧅',  tipo: 'contorno', precio: 1.5  },
  { id: 'mod-x-queso',     nombre: 'Extra queso',     emoji: '🧀',  tipo: 'extra',    precio: 1.5  },
  { id: 'mod-x-mozz',      nombre: 'Extra mozzarella',emoji: '🧀',  tipo: 'extra',    precio: 2    },
  { id: 'mod-x-tocineta',  nombre: 'Extra tocineta',  emoji: '🥓',  tipo: 'extra',    precio: 2    },
  { id: 'mod-sin-queso',   nombre: 'Sin queso',       emoji: '❌',  tipo: 'sin',      precio: 0    },
  { id: 'mod-sin-cebolla', nombre: 'Sin cebolla',     emoji: '❌',  tipo: 'sin',      precio: 0    },
  { id: 'mod-sin-salsa',   nombre: 'Sin salsa',       emoji: '❌',  tipo: 'sin',      precio: 0    },
]

function loadPool(): PoolModifier[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return SEED
    const parsed = JSON.parse(raw) as PoolModifier[]
    return Array.isArray(parsed) ? parsed : SEED
  } catch {
    return SEED
  }
}

function savePool(pool: PoolModifier[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(pool)) } catch { /* noop */ }
}

function genId() {
  return `mod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function ModItemsSec({ showToast }: Props) {
  const [pool, setPool] = useState<PoolModifier[]>([])
  const [filterTipo, setFilterTipo] = useState<'' | PoolModifier['tipo']>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🧀')
  const [tipo, setTipo] = useState<PoolModifier['tipo']>('extra')
  const [precio, setPrecio] = useState('0')

  useEffect(() => { setPool(loadPool()) }, [])

  const filtered = filterTipo ? pool.filter(m => m.tipo === filterTipo) : pool

  const openModal = (mod?: PoolModifier) => {
    setEditId(mod?.id ?? null)
    setNombre(mod?.nombre ?? '')
    setEmoji(mod?.emoji ?? '🧀')
    setTipo(mod?.tipo ?? 'extra')
    setPrecio(mod?.precio?.toString() ?? '0')
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditId(null) }

  const saveMod = () => {
    if (!nombre.trim()) { showToast('⚠️ Ingresa el nombre', 'error'); return }
    const p = tipo === 'sin' ? 0 : (parseFloat(precio) || 0)
    const data: PoolModifier = {
      id: editId || genId(),
      nombre: nombre.trim(),
      emoji: emoji.trim() || '•',
      tipo,
      precio: p,
    }
    setPool(prev => {
      const next = editId ? prev.map(m => m.id === editId ? data : m) : [...prev, data]
      savePool(next)
      return next
    })
    setModalOpen(false)
    showToast('✅ Modificador guardado')
  }

  const deleteMod = (id: string) => {
    if (!confirm('¿Eliminar este modificador?')) return
    setPool(prev => {
      const next = prev.filter(m => m.id !== id)
      savePool(next)
      return next
    })
    showToast('🗑️ Modificador eliminado')
  }

  const tipoLabel = (t: PoolModifier['tipo']) => TIPOS.find(x => x.value === t)?.label ?? t

  return (
    <>
      <div className="page-title">Pool de Modificadores</div>
      <div className="page-sub">Catálogo único de contornos, extras y opciones "sin…" · reutilizables por cualquier plato</div>

      <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          className="fselect"
          style={{ width: 240 }}
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as '' | PoolModifier['tipo'])}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Modificadores</div>
            <div className="card-sub">{filtered.length}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nuevo modificador</button>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 40 }}>Emoji</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(mod => (
              <tr key={mod.id}>
                <td style={{ fontSize: 18 }}>{mod.emoji}</td>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{mod.nombre}</td>
                <td>{tipoLabel(mod.tipo)}</td>
                <td>
                  {mod.precio > 0 ? (
                    <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--orange)', fontWeight: 700 }}>
                      +${mod.precio.toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>Sin costo</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openModal(mod)} style={{ marginRight: 4 }}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteMod(mod.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '20px' }}>
                  Sin modificadores · Crea el primero
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar Modificador' : 'Nuevo Modificador'}</div>
              <div className="modal-sub">Pool compartido · se asigna a platos desde "Asignar a platos"</div>
            </div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>

          <div className="modal-body">
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Emoji</label>
                <input className="finput" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🧀" maxLength={4} />
              </div>
              <div className="fgroup">
                <label className="flabel">Nombre</label>
                <input className="finput" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Extra queso" />
              </div>

              <div className="fgroup full">
                <label className="flabel">Tipo</label>
                <select className="fselect" value={tipo} onChange={(e) => setTipo(e.target.value as PoolModifier['tipo'])}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="fgroup full">
                <label className="flabel">Precio adicional</label>
                <input
                  className="finput"
                  type="number"
                  value={tipo === 'sin' ? '0' : precio}
                  disabled={tipo === 'sin'}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {tipo === 'sin' && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    Los "sin…" siempre tienen precio 0
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveMod}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModItemsSec
