'use client'
import { useState, useEffect, useCallback } from 'react'
import type { AdminSession, Categoria } from '@/types/admin'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

const ESTACIONES = [
  { value: 'cocina', label: 'Cocina Principal', emoji: '🍳' },
  { value: 'horno', label: 'Horno / Pizzas', emoji: '🔥' },
  { value: 'barra', label: 'Barra', emoji: '🍹' },
  { value: 'fria', label: 'Estación Fría', emoji: '🥗' },
]

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function CategoriasSec({ session, showToast }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [imgUrl, setImgUrl] = useState('')
  const [estacion, setEstacion] = useState('cocina')
  const [usaSubgrupos, setUsaSubgrupos] = useState(false)
  const [subgruposText, setSubgruposText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      const res = await fetch('/api/menu')
      if (res.ok) {
        const json = await res.json()
        const items: Array<{ cat_id?: string; cat?: string }> = json?.data ?? []
        const map = new Map<string, Categoria>()
        for (const it of items) {
          const id = it.cat_id || it.cat
          if (!id || map.has(id)) continue
          map.set(id, {
            id,
            tenant_id: session.tenantId,
            nombre: it.cat || id,
            emoji: '🍽️',
            orden: map.size,
            activo: true,
          })
        }
        setCategorias(Array.from(map.values()))
      }
    } catch {
      setCategorias([])
    }
  }

  const openModal = useCallback((catId?: string) => {
    const cat = catId ? categorias.find(c => c.id === catId) : null
    setEditId(cat?.id ?? null)
    setNombre(cat?.nombre ?? '')
    setEmoji(cat?.emoji ?? '🍽️')
    setImgUrl(cat?.imagen_url ?? '')
    setEstacion(cat?.parent_id ?? 'cocina')
    setUsaSubgrupos(!!cat?.parent_id)
    setSubgruposText('')
    setModalOpen(true)
  }, [categorias])

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const toggleSubgrupos = () => {
    setUsaSubgrupos(v => !v)
  }

  const saveCategoria = async () => {
    if (!nombre.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }

    const subgrupos = usaSubgrupos
      ? subgruposText.split('\n').map(s => s.trim()).filter(Boolean)
      : []

    const data: Categoria = {
      id: editId || genId('cat'),
      tenant_id: session.tenantId,
      nombre: nombre.trim(),
      emoji,
      imagen_url: imgUrl.trim() || undefined,
      orden: 0,
      activo: true,
      items_count: 0,
    }

    try {
      if (editId) {
        const res = await fetch(`${session.tenantId}/categorias/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Update failed')
      } else {
        const res = await fetch(`${session.tenantId}/categorias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Create failed')
      }
      setModalOpen(false)
      loadCategorias()
      showToast('✅ Categoría guardada')
    } catch {
      setCategorias(prev => {
        if (editId) {
          return prev.map(c => c.id === editId ? data : c)
        }
        return [...prev, data]
      })
      setModalOpen(false)
      showToast('✅ Categoría guardada')
    }
  }

  const deleteCategoria = async () => {
    if (!editId) return
    if (!confirm('¿Eliminar esta categoría?')) return

    try {
      await fetch(`${session.tenantId}/categorias/${editId}`, { method: 'DELETE' })
    } catch {
      // Continue with local delete
    }

    setCategorias(prev => prev.filter(c => c.id !== editId))
    setModalOpen(false)
    showToast('🗑️ Categoría eliminada')
  }

  return (
    <>
      <div className="page-title">Categorías del Menú</div>
      <div className="page-sub">Grupos de ítems · sub-grupos opcionales · imagen o emoji</div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Categorías activas</div>
            <div className="card-sub">Click para editar · arrastra para reordenar</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nueva categoría</button>
        </div>

        <div className="cat-grid-admin">
          {categorias.map(cat => (
            <div
              key={cat.id}
              className="cat-card"
              onClick={() => openModal(cat.id)}
            >
              {cat.imagen_url ? (
                <img
                  src={cat.imagen_url}
                  className="cat-card-img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="cat-card-em">{cat.emoji}</div>
              )}
              <div className="cat-card-name">{cat.nombre}</div>
              <div className="cat-card-sub">
                {cat.items_count ?? 0} ítems
              </div>
              {usaSubgrupos && (
                <div className="cat-card-badge">
                  <span className="badge b-purple">MATRIZ</span>
                </div>
              )}
            </div>
          ))}

          {categorias.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-dim)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
            }}>
              Sin categorías · Crea la primera
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar Categoría' : 'Nueva Categoría'}</div>
              <div className="modal-sub">Grupo principal de ítems en el menú</div>
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
                  placeholder="Ej: Pizzas, Carnes..."
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
                <label className="flabel">URL de imagen (opcional)</label>
                <input
                  className="finput"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="fgroup full">
                <label className="flabel">Estación KDS destino</label>
                <select
                  className="fselect"
                  value={estacion}
                  onChange={(e) => setEstacion(e.target.value)}
                >
                  {ESTACIONES.map(est => (
                    <option key={est.value} value={est.value}>
                      {est.emoji} {est.label}
                    </option>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>¿Usa sub-grupos?</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      Activa la matriz de precios por sub-grupo (ej. tamaños de pizza)
                    </div>
                  </div>
                  <div
                    className={`sw ${usaSubgrupos ? 'on' : ''}`}
                    onClick={toggleSubgrupos}
                  />
                </div>
              </div>

              {usaSubgrupos && (
                <div className="fgroup full">
                  <label className="flabel">Sub-grupos (uno por línea)</label>
                  <textarea
                    className="ftextarea"
                    value={subgruposText}
                    onChange={(e) => setSubgruposText(e.target.value)}
                    placeholder="Personal&#10;Mediana&#10;Grande"
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    Cada sub-grupo genera una columna de precios en la matriz del ítem
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-foot">
            {editId && (
              <button
                className="btn btn-red btn-sm"
                onClick={deleteCategoria}
                style={{ marginRight: 'auto' }}
              >
                🗑️ Eliminar
              </button>
            )}
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveCategoria}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CategoriasSec
