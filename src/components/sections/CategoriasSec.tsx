'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Categorías del Menú
// Pixel-perfect match con sec-categorias (líneas 496-506)
// Grid de tarjetas · click para editar · CRUD completo
// Archivo: src/components/admin/sections/CategoriasSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'
import type { Categoria } from '@/types/admin'

export function CategoriasSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [isNew, setIsNew] = useState(false)

  // ── Cargar categorías ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sbFetch(`categorias?tenant_id=eq.${session.tenantId}&select=*&order=orden.asc`)
      setCategorias(Array.isArray(data) ? data : [])
    } catch (e) { showToast('Error cargando categorías', 'error') }
    finally { setLoading(false) }
  }, [session.tenantId, sbFetch, showToast])

  useEffect(() => { load() }, [])

  // ── Guardar ──
  const save = async () => {
    if (!editing) return
    if (!editing.nombre.trim()) { showToast('Nombre requerido', 'error'); return }
    try {
      if (isNew) {
        const id = crypto.randomUUID?.() || `cat_${Date.now()}`
        await sbFetch('categorias', {
          method: 'POST',
          body: JSON.stringify({ ...editing, id, tenant_id: session.tenantId }),
        })
      } else {
        await sbFetch(`categorias?id=eq.${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nombre: editing.nombre, emoji: editing.emoji, orden: editing.orden, activo: editing.activo }),
        })
      }
      showToast(isNew ? 'Categoría creada' : 'Categoría actualizada')
      setEditing(null)
      load()
    } catch (e) { showToast('Error guardando', 'error') }
  }

  // ── Eliminar ──
  const remove = async (id: string) => {
    try {
      await sbFetch(`categorias?id=eq.${id}`, { method: 'DELETE' })
      showToast('Categoría eliminada')
      load()
    } catch (e) { showToast('Error eliminando', 'error') }
  }

  const openNew = () => {
    setEditing({ id: '', tenant_id: session.tenantId, nombre: '', emoji: '📁', orden: categorias.length + 1, activo: true })
    setIsNew(true)
  }

  const openEdit = (cat: Categoria) => {
    setEditing({ ...cat })
    setIsNew(false)
  }

  // ── Switch component ──
  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <div style={S.sw(on)} onClick={onClick}><div style={S.swDot(on)} /></div>
  )

  return (
    <div>
      {/* Título — match exacto líneas 497-498 */}
      <div style={S.pageTitle}>Categorías del Menú</div>
      <div style={S.pageSub}>Grupos de ítems · sub-grupos opcionales · imagen o emoji</div>

      {/* Card principal — match líneas 499-505 */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div>
            <div style={S.cardTitle}>Categorías activas</div>
            <div style={S.cardSub}>Click para editar · arrastra para reordenar</div>
          </div>
          <button onClick={openNew} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nueva categoría</button>
        </div>

        {/* Grid de categorías — match cat-grid-admin */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10, padding: 12,
        }}>
          {loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: c.textDim, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
              Cargando categorías...
            </div>
          )}
          {!loading && categorias.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: c.textDim, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
              Sin categorías · crea la primera
            </div>
          )}
          {categorias.map(cat => (
            <div
              key={cat.id}
              onClick={() => openEdit(cat)}
              style={{
                ...S.catCard,
                opacity: cat.activo !== false ? 1 : 0.4,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.orange }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}
            >
              {/* Badge activo/inactivo */}
              {cat.activo === false && (
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <span style={S.badge('rgba(255,71,87,0.12)', c.red, 'rgba(255,71,87,0.25)')}>OFF</span>
                </div>
              )}
              {/* Emoji grande */}
              <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1 }}>{cat.emoji || '📁'}</div>
              {/* Nombre */}
              <div style={S.catCardName}>{cat.nombre}</div>
              {/* Sub info */}
              <div style={S.catCardSub}>Orden: {cat.orden}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal editar/crear categoría ── */}
      {editing && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div>
                <div style={S.modalTitle}>{isNew ? 'Nueva Categoría' : 'Editar Categoría'}</div>
                <div style={S.modalSub}>{isNew ? 'Crear grupo de ítems' : `ID: ${editing.id.slice(0, 8)}...`}</div>
              </div>
              <button onClick={() => setEditing(null)} style={S.modalClose}>✕</button>
            </div>

            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Nombre */}
                <div style={{ ...S.fgroup, gridColumn: '1/-1' }}>
                  <label style={S.flabel}>NOMBRE</label>
                  <input
                    type="text"
                    value={editing.nombre}
                    onChange={e => setEditing({ ...editing, nombre: e.target.value })}
                    style={S.finput}
                    placeholder="Ej: Hamburguesas, Bebidas..."
                    autoFocus
                  />
                </div>
                {/* Emoji */}
                <div style={S.fgroup}>
                  <label style={S.flabel}>EMOJI</label>
                  <input
                    type="text"
                    value={editing.emoji}
                    onChange={e => setEditing({ ...editing, emoji: e.target.value })}
                    style={{ ...S.finput, fontSize: 24, textAlign: 'center', padding: '10px' }}
                  />
                </div>
                {/* Orden */}
                <div style={S.fgroup}>
                  <label style={S.flabel}>ORDEN</label>
                  <input
                    type="number"
                    min="1"
                    value={editing.orden}
                    onChange={e => setEditing({ ...editing, orden: parseInt(e.target.value) || 1 })}
                    style={S.finput}
                  />
                </div>
                {/* Activo */}
                <div style={{ ...S.fgroup, gridColumn: '1/-1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Activa en el POS</span>
                  <Switch on={editing.activo !== false} onClick={() => setEditing({ ...editing, activo: !editing.activo })} />
                </div>
              </div>

              {/* Preview */}
              <div style={{ marginTop: 14, padding: 14, background: c.surface2, borderRadius: 8, border: `1px solid ${c.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, color: c.textDim, textTransform: 'uppercase', marginBottom: 8 }}>PREVIEW EN POS</div>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{editing.emoji || '📁'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{editing.nombre || '—'}</div>
              </div>
            </div>

            <div style={S.modalFoot}>
              {!isNew && (
                <button onClick={() => { remove(editing.id); setEditing(null) }} style={{ ...S.btn, ...S.btnRed, ...S.btnSm, marginRight: 'auto' }}>
                  🗑️ Eliminar
                </button>
              )}
              <button onClick={() => setEditing(null)} style={{ ...S.btn, ...S.btnGhost }}>Cancelar</button>
              <button onClick={save} style={{ ...S.btn, ...S.btnPrimary }}>
                {isNew ? '✓ Crear' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
