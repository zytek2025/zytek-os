'use client'
import { useState, useEffect, useCallback } from 'react'
import type { AdminSession, Categoria } from '@/types/admin'
import '../admin.css'

interface SubGrupo {
  id: string
  catId: string
  nombre: string
  emoji: string
  orden: number
}

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

export function SubgruposSec({ session, showToast }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subgrupos, setSubgrupos] = useState<SubGrupo[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('📏')
  const [catId, setCatId] = useState('')
  const [orden, setOrden] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [catsRes, sgsRes] = await Promise.all([
        fetch(`${session.tenantId}/categorias`),
        fetch(`${session.tenantId}/subgrupos`),
      ])
      if (catsRes.ok) setCategorias(await catsRes.json())
      if (sgsRes.ok) setSubgrupos(await sgsRes.json())
    } catch {
      setCategorias([])
      setSubgrupos([])
    }
  }

  const filtered = filterCat
    ? subgrupos.filter(sg => sg.catId === filterCat)
    : subgrupos

  const getCatNombre = (catId: string) => {
    return categorias.find(c => c.id === catId)?.nombre ?? catId
  }

  const openModal = (sg?: SubGrupo) => {
    setEditId(sg?.id ?? null)
    setNombre(sg?.nombre ?? '')
    setEmoji(sg?.emoji ?? '📏')
    setCatId(sg?.catId ?? (categorias[0]?.id ?? ''))
    setOrden(sg?.orden ?? 0)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const saveSubGrupo = () => {
    if (!nombre.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }
    if (!catId) {
      showToast('⚠️ Selecciona una categoría', 'error')
      return
    }

    const data: SubGrupo = {
      id: editId || genId('sg'),
      catId,
      nombre: nombre.trim(),
      emoji,
      orden,
    }

    setSubgrupos(prev => {
      if (editId) return prev.map(s => s.id === editId ? data : s)
      return [...prev, data]
    })
    setModalOpen(false)
    showToast('✅ Sub-grupo guardado')
  }

  const deleteSubGrupo = async (id: string) => {
    if (!confirm('¿Eliminar este sub-grupo?')) return
    setSubgrupos(prev => prev.filter(s => s.id !== id))
    showToast('🗑️ Sub-grupo eliminado')
  }

  return (
    <>
      <div className="page-title">Sub-grupos</div>
      <div className="page-sub">Tamaños · presentaciones · variantes que definen el precio · ej: Personal / Mediana / Grande</div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Filtrar por categoría</div>
          <select
            className="fselect"
            style={{ width: 220 }}
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="">Todas las categorías con sub-grupos</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Sub-grupos configurados</div>
            <div className="card-sub">{filtered.length}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nuevo sub-grupo</button>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Emoji</th>
              <th>Orden</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sg => (
              <tr key={sg.id}>
                <td>{sg.nombre}</td>
                <td>{getCatNombre(sg.catId)}</td>
                <td style={{ fontSize: 16 }}>{sg.emoji}</td>
                <td>{sg.orden}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openModal(sg)}
                    style={{ marginRight: 4 }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteSubGrupo(sg.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '20px' }}>
                  Sin sub-grupos configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar Sub-grupo' : 'Nuevo Sub-grupo'}</div>
              <div className="modal-sub">Tamaños o presentaciones dentro de una categoría</div>
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
                  placeholder="Ej: Personal, Mediana, Grande"
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Emoji</label>
                <input
                  className="finput"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="📏"
                  maxLength={4}
                  style={{ fontSize: 20, textAlign: 'center' }}
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Categoría</label>
                <select
                  className="fselect"
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="fgroup">
                <label className="flabel">Orden</label>
                <input
                  className="finput"
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveSubGrupo}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SubgruposSec
