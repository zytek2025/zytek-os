'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Modificadores Individuales
// Match: sec-mod-items (líneas 549-567)
// Archivo: src/components/admin/sections/ModItemsSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'
import type { Modificador, ModGrupo } from '@/types/admin'

export function ModItemsSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)
  const [mods, setMods] = useState<Modificador[]>([])
  const [grupos, setGrupos] = useState<ModGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGroup, setFilterGroup] = useState('')
  const [editing, setEditing] = useState<Modificador | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [modsData, gruposData] = await Promise.all([
          sbFetch(`modificadores?tenant_id=eq.${session.tenantId}&select=*&order=grupo_id.asc,nombre.asc`),
          sbFetch(`mod_grupos?tenant_id=eq.${session.tenantId}&select=*&order=orden.asc`),
        ])
        setMods(Array.isArray(modsData) ? modsData : [])
        setGrupos(Array.isArray(gruposData) ? gruposData : [])
      } catch (e) { showToast('Error cargando modificadores', 'error') }
      finally { setLoading(false) }
    })()
  }, [])

  const filtered = filterGroup ? mods.filter(m => m.grupo_id === filterGroup) : mods
  const getGrupoNombre = (gid: string) => grupos.find(g => g.id === gid)?.nombre || '—'

  const save = async () => {
    if (!editing || !editing.nombre.trim()) { showToast('Nombre requerido', 'error'); return }
    try {
      if (isNew) {
        const id = crypto.randomUUID?.() || `mi_${Date.now()}`
        const created = await sbFetch('modificadores', { method: 'POST', body: JSON.stringify({ ...editing, id, tenant_id: session.tenantId }) })
        if (created?.[0]) setMods(prev => [...prev, created[0]])
      } else {
        await sbFetch(`modificadores?id=eq.${editing.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: editing.nombre, precio: editing.precio, tipo: editing.tipo, grupo_id: editing.grupo_id, activo: editing.activo }) })
        setMods(prev => prev.map(m => m.id === editing.id ? { ...m, ...editing } : m))
      }
      showToast(isNew ? 'Modificador creado' : 'Modificador actualizado')
      setEditing(null)
    } catch (e) { showToast('Error guardando', 'error') }
  }

  const tipoBadge = (tipo: string) => {
    if (tipo === 'extra') return { text: '+ Extra', bg: 'rgba(46,232,122,0.1)', color: c.green, border: 'rgba(46,232,122,0.25)' }
    if (tipo === 'sin') return { text: '− Sin', bg: 'rgba(255,71,87,0.12)', color: c.red, border: 'rgba(255,71,87,0.25)' }
    return { text: '⟳ Variante', bg: c.blue + '1a', color: c.blue, border: c.blue + '40' }
  }

  const newMod = (): Modificador => ({
    id: '', tenant_id: session.tenantId, nombre: '', precio: 0, tipo: 'extra',
    grupo_id: grupos[0]?.id || '', activo: true,
  })

  return (
    <div>
      <div style={S.pageTitle}>Modificadores</div>
      <div style={S.pageSub}>Contornos · extras · opciones individuales · con precio adicional opcional</div>

      {/* Filtro por grupo */}
      <div style={{ marginBottom: 10 }}>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ ...S.fselect, width: 240 }}>
          <option value="">Todos los grupos</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <div>
            <div style={S.cardTitle}>Modificadores</div>
            <div style={S.cardSub}>{filtered.length} modificadores</div>
          </div>
          <button onClick={() => { setEditing(newMod()); setIsNew(true) }} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nuevo modificador</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Nombre</th><th style={S.th}>Grupo</th><th style={S.th}>Tipo</th><th style={S.th}>Precio adicional</th><th style={S.th}>Estado</th><th style={S.th}></th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30 }}>Cargando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin modificadores</td></tr>}
              {filtered.map(mod => {
                const tipo = tipoBadge(mod.tipo)
                return (
                  <tr key={mod.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ ...S.td, fontWeight: 600, color: c.text }}>{mod.nombre}</td>
                    <td style={S.td}><span style={S.badge(c.surface2, c.textDim, c.border)}>{getGrupoNombre(mod.grupo_id)}</span></td>
                    <td style={S.td}><span style={S.badge(tipo.bg, tipo.color, tipo.border)}>{tipo.text}</span></td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", color: mod.precio > 0 ? c.amber : c.textDim }}>{mod.precio > 0 ? `+$${mod.precio.toFixed(2)}` : '—'}</td>
                    <td style={S.td}><span style={S.badge(mod.activo ? 'rgba(46,232,122,0.1)' : 'rgba(255,71,87,0.12)', mod.activo ? c.green : c.red, mod.activo ? 'rgba(46,232,122,0.25)' : 'rgba(255,71,87,0.25)')}>{mod.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={S.td}><button onClick={() => { setEditing({ ...mod }); setIsNew(false) }} style={{ ...S.btn, ...S.btnGhost, ...S.btnSm }}>✏️</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div style={S.modalTitle}>{isNew ? 'Nuevo Modificador' : 'Editar Modificador'}</div>
              <button onClick={() => setEditing(null)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}><label style={S.flabel}>NOMBRE</label><input type="text" value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} style={S.finput} autoFocus placeholder="Ej: Extra queso, Sin cebolla..." /></div>
                <div style={S.fgroup}><label style={S.flabel}>GRUPO</label>
                  <select value={editing.grupo_id} onChange={e => setEditing({ ...editing, grupo_id: e.target.value })} style={S.fselect}>
                    <option value="">— Sin grupo —</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div style={S.fgroup}><label style={S.flabel}>TIPO</label>
                  <select value={editing.tipo} onChange={e => setEditing({ ...editing, tipo: e.target.value as any })} style={S.fselect}>
                    <option value="extra">+ Extra (agrega)</option>
                    <option value="sin">− Sin (quita)</option>
                    <option value="variante">⟳ Variante (reemplaza)</option>
                  </select>
                </div>
                <div style={S.fgroup}><label style={S.flabel}>PRECIO ADICIONAL ($)</label><input type="number" step="0.01" min="0" value={editing.precio} onChange={e => setEditing({ ...editing, precio: parseFloat(e.target.value) || 0 })} style={S.finput} /></div>
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
