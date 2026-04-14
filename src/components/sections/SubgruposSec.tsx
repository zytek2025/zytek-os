'use client'
import { useState, useEffect } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'

interface SubGrupo {
  id: string; nombre: string; categoria: string; emoji: string; orden: number; tenant_id: string
}

export function SubgruposSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)
  const [items, setItems] = useState<SubGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('')
  const [editing, setEditing] = useState<SubGrupo | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await sbFetch(`subgrupos?tenant_id=eq.${session.tenantId}&select=*&order=orden.asc`)
        setItems(Array.isArray(data) ? data : [])
      } catch (e) { showToast('Error cargando sub-grupos', 'error') }
      finally { setLoading(false) }
    })()
  }, [])

  const filtered = filterCat ? items.filter(i => i.categoria === filterCat) : items
  const categorias = [...new Set(items.map(i => i.categoria).filter(Boolean))]

  const save = async () => {
    if (!editing || !editing.nombre.trim()) { showToast('Nombre requerido', 'error'); return }
    try {
      if (isNew) {
        const id = crypto.randomUUID?.() || `sg_${Date.now()}`
        const created = await sbFetch('subgrupos', { method: 'POST', body: JSON.stringify({ ...editing, id, tenant_id: session.tenantId }) })
        if (created?.[0]) setItems(prev => [...prev, created[0]])
      } else {
        await sbFetch(`subgrupos?id=eq.${editing.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: editing.nombre, emoji: editing.emoji, categoria: editing.categoria, orden: editing.orden }) })
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...editing } : i))
      }
      showToast(isNew ? 'Sub-grupo creado' : 'Sub-grupo actualizado')
      setEditing(null)
    } catch (e) { showToast('Error guardando', 'error') }
  }

  return (
    <div>
      <div style={S.pageTitle}>Sub-grupos</div>
      <div style={S.pageSub}>Tamaños · presentaciones · variantes que definen el precio · ej: Personal / Mediana / Grande</div>

      {/* Filtro por categoría */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardTitle}>Filtrar por categoría</div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...S.fselect, width: 220 }}>
            <option value="">Todas las categorías</option>
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div>
            <div style={S.cardTitle}>Sub-grupos configurados</div>
            <div style={S.cardSub}>{filtered.length} sub-grupos</div>
          </div>
          <button onClick={() => { setEditing({ id: '', nombre: '', categoria: '', emoji: '📐', orden: items.length + 1, tenant_id: session.tenantId }); setIsNew(true) }} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nuevo sub-grupo</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Nombre</th><th style={S.th}>Categoría</th><th style={S.th}>Emoji</th><th style={S.th}>Orden</th><th style={S.th}></th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 30 }}>Cargando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin sub-grupos</td></tr>}
              {filtered.map(sg => (
                <tr key={sg.id} style={{ cursor: 'pointer' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.orangeDim }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                  <td style={{ ...S.td, fontWeight: 600, color: c.text }}>{sg.nombre}</td>
                  <td style={S.td}><span style={S.badge(c.surface2, c.textDim, c.border)}>{sg.categoria || '—'}</span></td>
                  <td style={S.td}>{sg.emoji}</td>
                  <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>{sg.orden}</td>
                  <td style={S.td}><button onClick={() => { setEditing({ ...sg }); setIsNew(false) }} style={{ ...S.btn, ...S.btnGhost, ...S.btnSm }}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div style={S.modalTitle}>{isNew ? 'Nuevo Sub-grupo' : 'Editar Sub-grupo'}</div>
              <button onClick={() => setEditing(null)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}><label style={S.flabel}>NOMBRE</label><input type="text" value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} style={S.finput} autoFocus /></div>
                <div style={S.fgroup}><label style={S.flabel}>CATEGORÍA</label><input type="text" value={editing.categoria} onChange={e => setEditing({ ...editing, categoria: e.target.value })} style={S.finput} /></div>
                <div style={S.fgroup}><label style={S.flabel}>EMOJI</label><input type="text" value={editing.emoji} onChange={e => setEditing({ ...editing, emoji: e.target.value })} style={{ ...S.finput, fontSize: 20, textAlign: 'center' }} /></div>
                <div style={S.fgroup}><label style={S.flabel}>ORDEN</label><input type="number" min="1" value={editing.orden} onChange={e => setEditing({ ...editing, orden: parseInt(e.target.value) || 1 })} style={S.finput} /></div>
              </div>
            </div>
            <div style={S.modalFoot}>
              <button onClick={() => setEditing(null)} style={{ ...S.btn, ...S.btnGhost }}>Cancelar</button>
              <button onClick={save} style={{ ...S.btn, ...S.btnPrimary }}>{isNew ? '✓ Crear' : '💾 Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
