'use client'
import { useState } from 'react'
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

interface Impuesto {
  id: string
  nombre: string
  porcentaje: number
  incluido: boolean
  activo: boolean
}

function genId() {
  return `tax_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const DEFAULTS: Impuesto[] = [
  { id: 'tax_iva', nombre: 'IVA', porcentaje: 16, incluido: false, activo: true },
]

export function ConfigImpuestosSec({ showToast }: Props) {
  const [impuestos, setImpuestos] = useState<Impuesto[]>(DEFAULTS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [incluido, setIncluido] = useState(false)

  const openModal = (imp?: Impuesto) => {
    setEditId(imp?.id ?? null)
    setNombre(imp?.nombre ?? '')
    setPorcentaje(imp?.porcentaje?.toString() ?? '')
    setIncluido(imp?.incluido ?? false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const saveImpuesto = () => {
    if (!nombre.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }
    const pct = parseFloat(porcentaje)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast('⚠️ Porcentaje inválido (0-100)', 'error')
      return
    }

    const data: Impuesto = {
      id: editId || genId(),
      nombre: nombre.trim(),
      porcentaje: pct,
      incluido,
      activo: true,
    }

    setImpuestos(prev => editId
      ? prev.map(i => i.id === editId ? data : i)
      : [...prev, data])
    closeModal()
    showToast('✅ Impuesto guardado')
  }

  const toggleActivo = (id: string) => {
    setImpuestos(prev => prev.map(i => i.id === id ? { ...i, activo: !i.activo } : i))
  }

  const deleteImpuesto = (id: string) => {
    if (!confirm('¿Eliminar este impuesto?')) return
    setImpuestos(prev => prev.filter(i => i.id !== id))
    showToast('🗑️ Impuesto eliminado')
  }

  return (
    <>
      <div className="page-title">Impuestos</div>
      <div className="page-sub">Configura IVA, ISLR y otros impuestos aplicados a las ventas</div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nuevo impuesto</button>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>%</th>
                <th>Modo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {impuestos.map(imp => (
                <tr key={imp.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>{imp.nombre}</td>
                  <td>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--orange)', fontWeight: 700 }}>
                      {imp.porcentaje.toFixed(2)}%
                    </span>
                  </td>
                  <td>
                    {imp.incluido ? (
                      <span className="badge b-blue">Incluido en precio</span>
                    ) : (
                      <span className="badge b-amber">Sumado al total</span>
                    )}
                  </td>
                  <td>
                    {imp.activo
                      ? <span className="badge b-green">Activo</span>
                      : <span className="badge b-gray">Inactivo</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openModal(imp)} style={{ marginRight: 4 }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(imp.id)}>
                      {imp.activo ? '⏸' : '▶'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteImpuesto(imp.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {impuestos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '30px' }}>
                    Sin impuestos · Crea el primero
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar Impuesto' : 'Nuevo Impuesto'}</div>
              <div className="modal-sub">Tasa aplicada en el POS</div>
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
                  placeholder="IVA, ISLR..."
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Porcentaje (%)</label>
                <input
                  className="finput"
                  type="number"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  placeholder="16"
                  min="0"
                  max="100"
                  step="0.01"
                />
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>¿Incluido en el precio?</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      Si está activo, el precio del ítem ya contiene el impuesto
                    </div>
                  </div>
                  <div className={`sw ${incluido ? 'on' : ''}`} onClick={() => setIncluido(v => !v)} />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveImpuesto}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfigImpuestosSec
