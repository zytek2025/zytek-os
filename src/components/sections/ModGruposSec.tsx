'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Grupos de Modificadores
// Match: sec-mod-grupos (líneas 533-546)
// Archivo: src/components/admin/sections/ModGruposSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'
import type { ModGrupo } from '@/types/admin'

export function ModGruposSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)
  const [grupos, setGrupos] = useState<ModGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ModGrupo | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await sbFetch(`mod_grupos?tenant_id=eq.${session.tenantId}&select=*&order=orden.asc`)
        setGrupos(Array.isArray(data) ? data : [])
      } catch (e) { showToast('Error cargando grupos', 'error') }
      finally { setLoading(false) }
    })()
  }, [])

  const save = async () => {
    if (!editing || !editing.nombre.trim()) { showToast('Nombre requerido', 'error'); return }
    try {
      if (isNew) {
        const id = crypto.randomUUID?.() || `mg_${Date.now()}`
        const created = await sbFetch('mod_grupos', { method: 'POST', body: JSON.stringify({ ...editing, id, tenant_id: session.tenantId }) })
        if (created?.[0]) setGrupos(prev => [...prev, created[0]])
      } else {
        await sbFetch(`mod_grupos?id=eq.${editing.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: editing.nombre, tipo: editing.tipo, min_seleccion: editing.min_seleccion, max_seleccion: editing.max_seleccion, activo: editing.activo }) })
        setGrupos(prev => prev.map(g => g.id === editing.id ? { ...g, ...editing } : g))
      }
      showToast(isNew ? 'Grupo creado' : 'Grupo actualizado')
      setEditing(null)
    } catch (e) { showToast('Error guardando', 'error') }
  }

  const remove = async (id: string) => {
    try {
      await sbFetch(`mod_grupos?id=eq.${id}`, { method: 'DELETE' })
      setGrupos(prev => prev.filter(g => g.id !== id))
      showToast('Grupo eliminado')
    } catch (e) { showToast('Error', 'error') }
  }

  const newGrupo = (): ModGrupo => ({
    id: '', tenant_id: session.tenantId, nombre: '', tipo: 'seleccion_multiple',
    min_seleccion: 0, max_seleccion: 5, activo: true, orden: grupos.length + 1,
  })

  const tipoLabel = (t: string) => {
    if (t === 'seleccion_unica') return { text: 'Selección única', bg: c.blue + '1a', color: c.blue, border: c.blue + '40' }
    if (t === 'obligatorio') return { text: 'Obligatorio', bg: 'rgba(255,71,87,0.12)', color: c.red, border: 'rgba(255,71,87,0.25)' }
    return { text: 'Selección múltiple', bg: 'rgba(46,232,122,0.1)', color: c.green, border: 'rgba(46,232,122,0.25)' }
  }

  return (
    <div>
      <div style={S.pageTitle}>Grupos de Modificadores</div>
      <div style={S.pageSub}>Conjuntos de contornos · extras · opcionales · con mínimo y máximo de selección</div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <div>
            <div style={S.cardTitle}>Grupos</div>
            <div style={S.cardSub}>{grupos.length} grupos</div>
          </div>
          <button onClick={() => { setEditing(newGrupo()); setIsNew(true) }} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nuevo grupo</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Nombre del grupo</th><th style={S.th}>Tipo</th><th style={S.th}>Mín</th><th style={S.th}>Máx</th><th style={S.th}>Estado</th><th style={S.th}></th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30 }}>Cargando...</td></tr>}
              {!loading && grupos.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin grupos de modificadores</td></tr>}
              {grupos.map(g => {
                const tipo = tipoLabel(g.tipo)
                return (
                  <tr key={g.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={{ ...S.td, fontWeight: 600, color: c.text }}>{g.nombre}</td>
                    <td style={S.td}><span style={S.badge(tipo.bg, tipo.color, tipo.border)}>{tipo.text}</span></td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>{g.min_seleccion}</td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>{g.max_seleccion}</td>
                    <td style={S.td}><span style={S.badge(g.activo ? 'rgba(46,232,122,0.1)' : 'rgba(255,71,87,0.12)', g.activo ? c.green : c.red, g.activo ? 'rgba(46,232,122,0.25)' : 'rgba(255,71,87,0.25)')}>{g.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditing({ ...g }); setIsNew(false) }} style={{ ...S.btn, ...S.btnGhost, ...S.btnSm }}>✏️</button>
                        <button onClick={() => remove(g.id)} style={{ ...S.btn, ...S.btnRed, ...S.btnSm }}>🗑️</button>
                      </div>
                    </td>
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
              <div style={S.modalTitle}>{isNew ? 'Nuevo Grupo' : 'Editar Grupo'}</div>
              <button onClick={() => setEditing(null)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}><label style={S.flabel}>NOMBRE</label><input type="text" value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} style={S.finput} autoFocus placeholder="Ej: Contornos, Extras, Proteínas..." /></div>
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}><label style={S.flabel}>TIPO DE SELECCIÓN</label>
                  <select value={editing.tipo} onChange={e => setEditing({ ...editing, tipo: e.target.value as any })} style={S.fselect}>
                    <option value="seleccion_multiple">Selección múltiple (0 a N)</option>
                    <option value="seleccion_unica">Selección única (radio)</option>
                    <option value="obligatorio">Obligatorio (mínimo 1)</option>
                  </select>
                </div>
                <div style={S.fgroup}><label style={S.flabel}>MÍNIMO SELECCIÓN</label><input type="number" min="0" value={editing.min_seleccion} onChange={e => setEditing({ ...editing, min_seleccion: parseInt(e.target.value) || 0 })} style={S.finput} /></div>
                <div style={S.fgroup}><label style={S.flabel}>MÁXIMO SELECCIÓN</label><input type="number" min="1" value={editing.max_seleccion} onChange={e => setEditing({ ...editing, max_seleccion: parseInt(e.target.value) || 1 })} style={S.finput} /></div>
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
