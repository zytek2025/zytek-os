'use client'
import { useState, useEffect } from 'react'
import type { AdminSession, Categoria, MenuItem } from '@/types/admin'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const ESTACIONES: Record<string, string> = {
  cocina: '🍳 Cocina',
  horno: '🔥 Horno',
  barra: '🍹 Barra',
  fria: '🥗 Fría',
}

export function ItemsSec({ session, showToast }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [filterCat, setFilterCat] = useState<string>('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [catId, setCatId] = useState('')
  const [precio, setPrecio] = useState('')
  const [estacion, setEstacion] = useState('cocina')
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const itemsRes = await fetch('/api/menu')
      if (itemsRes.ok) {
        const json = await itemsRes.json()
        const list: MenuItem[] = json?.data ?? []
        setItems(list)

        const catMap = new Map<string, Categoria>()
        for (const it of list) {
          const id = it.cat_id || it.cat
          if (!id) continue
          if (!catMap.has(id)) {
            catMap.set(id, {
              id,
              tenant_id: session.tenantId,
              nombre: it.cat || id,
              emoji: '🍽️',
              orden: catMap.size,
              activo: true,
            })
          }
        }
        const cats = Array.from(catMap.values())
        setCategorias(cats)
        if (cats.length > 0 && !catId) setCatId(cats[0].id)
      }
    } catch {
      setCategorias([])
      setItems([])
    }
  }

  const getCatNombre = (id?: string) => {
    if (!id) return '—'
    return categorias.find(c => c.id === id)?.nombre ?? '—'
  }

  const getCatEmoji = (id?: string) => {
    if (!id) return ''
    return categorias.find(c => c.id === id)?.emoji ?? ''
  }

  const filtered = items.filter(item => {
    const matchCat = !filterCat || item.cat_id === filterCat
    const q = search.toLowerCase()
    const matchSearch = !q || item.nombre.toLowerCase().includes(q) || getCatNombre(item.cat_id).toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const openModal = (item?: MenuItem) => {
    setEditId(item?.id ?? null)
    setNombre(item?.nombre ?? '')
    setEmoji(item?.emoji ?? '🍽️')
    setCatId(item?.cat_id ?? (categorias[0]?.id ?? ''))
    setPrecio(item?.precio?.toString() ?? '')
    setEstacion('cocina')
    setActivo(item?.activo ?? true)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const saveItem = () => {
    if (!nombre.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }
    const precioNum = parseFloat(precio) || 0

    const data: MenuItem = {
      id: editId || genId('item'),
      tenant_id: session.tenantId,
      nombre: nombre.trim(),
      emoji,
      cat: getCatNombre(catId),
      cat_id: catId,
      precio: precioNum,
      activo,
      agotado: false,
    }

    setItems(prev => {
      if (editId) return prev.map(i => i.id === editId ? { ...i, ...data } : i)
      return [...prev, data]
    })
    setModalOpen(false)
    showToast('✅ Ítem guardado')
  }

  const toggleActivo = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, activo: !i.activo } : i))
  }

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este ítem?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('🗑️ Ítem eliminado')
  }

  return (
    <>
      <div className="page-title">Ítems / Platos</div>
      <div className="page-sub">Crear y editar platos · precios · modificadores · recetas</div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>CATEGORÍA:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <div
              className={`mod-chip ${!filterCat ? 'active' : ''}`}
              onClick={() => setFilterCat('')}
            >
              Ver todas
            </div>
            {categorias.map(cat => (
              <div
                key={cat.id}
                className={`mod-chip ${filterCat === cat.id ? 'active' : ''}`}
                onClick={() => setFilterCat(cat.id)}
              >
                {cat.emoji} {cat.nombre}
              </div>
            ))}
          </div>
          <input
            className="rep-input"
            placeholder="Buscar plato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 160 }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nuevo ítem</button>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Receta</th>
                <th>KDS</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{item.emoji}</span>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.nombre}</div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>
                    {getCatEmoji(item.cat_id)} {getCatNombre(item.cat_id)}
                  </td>
                  <td>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--orange)', fontWeight: 700 }}>
                      ${Number(item.precio || 0).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    {item.receta && item.receta.length > 0 ? (
                      <span className="badge b-blue">🧂 {item.receta.length} insumo{item.receta.length !== 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Sin receta</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>
                      {ESTACIONES[estacion] || estacion}
                    </span>
                  </td>
                  <td>
                    {item.activo ? (
                      <span className="badge b-green">Activo</span>
                    ) : (
                      <span className="badge b-gray">Inactivo</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openModal(item)} style={{ marginRight: 4 }}>✏️</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleActivo(item.id)}
                      title={item.activo ? 'Desactivar' : 'Activar'}
                    >
                      {item.activo ? '⏸' : '▶'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '30px' }}>
                    Sin ítems · Crea el primero
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar Ítem' : 'Nuevo Ítem'}</div>
              <div className="modal-sub"> Plato o producto del menú</div>
            </div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>

          <div className="modal-body">
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Nombre</label>
                <input
                  className="finput"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Margherita, Coca Cola..."
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Emoji</label>
                <input
                  className="finput"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🍕"
                  maxLength={4}
                  style={{ fontSize: 20, textAlign: 'center' }}
                />
              </div>

              <div className="fgroup full">
                <label className="flabel">Categoría</label>
                <select className="fselect" value={catId} onChange={(e) => setCatId(e.target.value)}>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="fgroup">
                <label className="flabel">Precio (USD)</label>
                <input
                  className="finput"
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Estación KDS</label>
                <select className="fselect" value={estacion} onChange={(e) => setEstacion(e.target.value)}>
                  {Object.entries(ESTACIONES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="fgroup full">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>¿Activo?</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      Visible en el POS
                    </div>
                  </div>
                  <div className={`sw ${activo ? 'on' : ''}`} onClick={() => setActivo(v => !v)} />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            {editId && (
              <button
                className="btn btn-red btn-sm"
                onClick={() => { if (editId) deleteItem(editId); closeModal() }}
                style={{ marginRight: 'auto' }}
              >
                🗑️ Eliminar
              </button>
            )}
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveItem}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ItemsSec
