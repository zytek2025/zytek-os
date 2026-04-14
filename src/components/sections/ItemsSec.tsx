'use client'
// ─────────────────────────────────────────────────────────────
// ItemsSec — Ítems / Platos del menú
// Match: sec-items (líneas 570-585)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'
import type { MenuItem } from '@/types/admin'

export function ItemsSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await sbFetch(`menu_items?tenant_id=eq.${session.tenantId}&select=*&order=nombre.asc`)
        setItems(Array.isArray(data) ? data : [])
      } catch (e) { showToast('Error cargando ítems', 'error') }
      finally { setLoading(false) }
    })()
  }, [])

  const categorias = [...new Set(items.map(i => i.cat).filter(Boolean))]
  const filtered = items
    .filter(i => filterCat === 'all' || i.cat === filterCat)
    .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!editing || !editing.nombre.trim()) { showToast('Nombre requerido', 'error'); return }
    try {
      if (isNew) {
        const id = crypto.randomUUID?.() || `item_${Date.now()}`
        const created = await sbFetch('menu_items', { method: 'POST', body: JSON.stringify({ ...editing, id, tenant_id: session.tenantId }) })
        if (created?.[0]) setItems(prev => [...prev, created[0]])
      } else {
        await sbFetch(`menu_items?id=eq.${editing.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: editing.nombre, precio: editing.precio, cat: editing.cat, emoji: editing.emoji, activo: editing.activo, agotado: editing.agotado }) })
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...editing } : i))
      }
      showToast(isNew ? 'Ítem creado' : 'Ítem actualizado')
      setEditing(null)
    } catch (e) { showToast('Error guardando', 'error') }
  }

  const toggleActivo = async (item: MenuItem) => {
    try {
      await sbFetch(`menu_items?id=eq.${item.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !item.activo }) })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !i.activo } : i))
      showToast(item.activo ? 'Desactivado' : 'Activado')
    } catch (e) { showToast('Error', 'error') }
  }

  const deleteItem = async (id: string) => {
    try {
      await sbFetch(`menu_items?id=eq.${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
      showToast('Eliminado')
    } catch (e) { showToast('Error', 'error') }
  }

  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <div style={S.sw(on)} onClick={onClick}><div style={S.swDot(on)} /></div>
  )

  const newItem = (): MenuItem => ({
    id: '', tenant_id: session.tenantId, nombre: '', precio: 0, cat: categorias[0] || '',
    emoji: '🍽️', activo: true, agotado: false,
  })

  return (
    <div>
      <div style={S.pageTitle}>Ítems / Platos</div>
      <div style={S.pageSub}>Crear y editar platos · precios · modificadores · recetas</div>

      {/* Filtro + búsqueda — match líneas 574-581 */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>CATEGORÍA:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <button onClick={() => setFilterCat('all')} style={{ padding: '3px 10px', borderRadius: 12, border: `1px solid ${c.border}`, background: filterCat === 'all' ? c.surface2 : 'transparent', fontSize: 10, fontFamily: "'DM Mono', monospace", color: filterCat === 'all' ? c.text : c.textDim, cursor: 'pointer' }}>Todos</button>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{ padding: '3px 10px', borderRadius: 12, border: `1px solid ${c.border}`, background: filterCat === cat ? c.surface2 : 'transparent', fontSize: 10, fontFamily: "'DM Mono', monospace", color: filterCat === cat ? c.text : c.textDim, cursor: 'pointer' }}>{cat}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plato..." style={{ ...S.finput, width: 160, padding: '5px 10px', fontSize: 11 }} />
          <button onClick={() => { setEditing(newItem()); setIsNew(true) }} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nuevo ítem</button>
        </div>
      </div>

      {/* Tabla de items */}
      <div style={S.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Producto</th><th style={S.th}>Categoría</th><th style={S.th}>Precio</th><th style={S.th}>Activo</th><th style={S.th}>Agotado</th><th style={S.th}></th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30 }}>Cargando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin ítems</td></tr>}
              {filtered.map(item => (
                <tr key={item.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{item.emoji || '🍽️'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: c.text, fontSize: 12 }}>{item.nombre}</div>
                        {item.descripcion && <div style={{ fontSize: 10, color: c.textDim }}>{item.descripcion}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.badge(c.surface2, c.textDim, c.border)}>{item.cat || '—'}</span></td>
                  <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: c.orange }}>${item.precio.toFixed(2)}</td>
                  <td style={S.td}><Switch on={item.activo !== false} onClick={() => toggleActivo(item)} /></td>
                  <td style={S.td}><span style={S.badge(item.agotado ? 'rgba(255,71,87,0.12)' : 'rgba(46,232,122,0.1)', item.agotado ? c.red : c.green, item.agotado ? 'rgba(255,71,87,0.25)' : 'rgba(46,232,122,0.25)')}>{item.agotado ? 'Agotado' : 'Disponible'}</span></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditing({ ...item }); setIsNew(false) }} style={{ ...S.btn, ...S.btnGhost, ...S.btnSm }}>✏️</button>
                      <button onClick={() => deleteItem(item.id)} style={{ ...S.btn, ...S.btnRed, ...S.btnSm }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar/crear */}
      {editing && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div style={S.modalTitle}>{isNew ? 'Nuevo Ítem' : 'Editar Ítem'}</div>
              <button onClick={() => setEditing(null)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}><label style={S.flabel}>NOMBRE</label><input type="text" value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} style={S.finput} autoFocus /></div>
                <div style={S.fgroup}><label style={S.flabel}>PRECIO ($)</label><input type="number" step="0.01" min="0" value={editing.precio} onChange={e => setEditing({ ...editing, precio: parseFloat(e.target.value) || 0 })} style={S.finput} /></div>
                <div style={S.fgroup}><label style={S.flabel}>EMOJI</label><input type="text" value={editing.emoji} onChange={e => setEditing({ ...editing, emoji: e.target.value })} style={{ ...S.finput, fontSize: 20, textAlign: 'center' }} /></div>
                <div style={S.fgroup}><label style={S.flabel}>CATEGORÍA</label><input type="text" value={editing.cat} onChange={e => setEditing({ ...editing, cat: e.target.value })} style={S.finput} list="cats-list" /><datalist id="cats-list">{categorias.map(c => <option key={c} value={c} />)}</datalist></div>
                <div style={{ ...S.fgroup, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: c.text }}>Activo</span><Switch on={editing.activo !== false} onClick={() => setEditing({ ...editing, activo: !editing.activo })} /></div>
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
