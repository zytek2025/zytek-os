'use client'
import { useState, useEffect } from 'react'
import type { AdminSession, MetodoPago } from '@/types/admin'
import { DEFAULT_METODOS_PAGO } from '@/types/admin'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export function ConfigMetodosSec({ session, showToast }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [metodos, setMetodos] = useState<MetodoPago[]>(DEFAULT_METODOS_PAGO)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    loadMetodos()
  }, [])

  const loadMetodos = async () => {
    try {
      const res = await fetch(`${session.tenantId}/metodos-pago`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) setMetodos(data)
      }
    } catch {
      // Use defaults
    }
  }

  const activeMetodos = metodos.filter(m => m.activo)

  const openModal = (metodo?: MetodoPago) => {
    setEditId(metodo?.id ?? null)
    setLabel(metodo?.label ?? '')
    setIcon(metodo?.icon ?? '')
    setActivo(metodo?.activo ?? true)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const saveMetodo = () => {
    if (!label.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }

    const data: MetodoPago = {
      id: editId || `mp_${Date.now()}`,
      label: label.trim(),
      icon: icon || '💳',
      activo,
    }

    setMetodos(prev => {
      if (editId) return prev.map(m => m.id === editId ? data : m)
      return [...prev, data]
    })
    setModalOpen(false)
    showToast('✅ Método de pago guardado')
  }

  const deleteMetodo = (id: string) => {
    if (!confirm('¿Eliminar este método?')) return
    setMetodos(prev => prev.filter(m => m.id !== id))
    showToast('🗑️ Método eliminado')
  }

  const toggleActivo = (id: string) => {
    setMetodos(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m))
  }

  return (
    <>
      <div className="page-title">🏦 Cuentas & Formas de Pago</div>
      <div className="page-sub">Bancos · Cajas · Terminales · Formas de pago conectadas al POS</div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <div className="kpi">
          <div className="kpi-label">Formas de pago</div>
          <div className="kpi-val" style={{ color: 'var(--green)' }}>{activeMetodos.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total métodos</div>
          <div className="kpi-val">{metodos.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <div
          className={`tab ${activeTab === 0 ? 'active' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          💳 Formas de pago
        </div>
        <div
          className={`tab ${activeTab === 1 ? 'active' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          🏦 Cuentas bancarias
        </div>
      </div>

      {activeTab === 0 && (
        <>
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 14,
            fontSize: 12,
            color: 'var(--text-mid)',
            lineHeight: 1.7,
          }}>
            💡 Cada forma de pago activa aparece en el POS al cobrar. Activa o desactiva según necesites.
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Formas de pago configuradas</div>
                <div className="card-sub">{activeMetodos.length} activas</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => openModal()}>+ Nueva forma de pago</button>
            </div>

            <div style={{ padding: '0 14px 14px', overflowX: 'auto' }}>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Nombre en POS</th>
                    <th>Icono</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {metodos.map(met => (
                    <tr key={met.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{met.label}</td>
                      <td style={{ fontSize: 20 }}>{met.icon}</td>
                      <td>
                        {met.activo ? (
                          <span className="badge b-green">Activo</span>
                        ) : (
                          <span className="badge b-gray">Inactivo</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openModal(met)} style={{ marginRight: 4 }}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(met.id)} title={met.activo ? 'Desactivar' : 'Activar'}>
                          {met.activo ? '⏸' : '▶'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteMetodo(met.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista previa POS */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <div className="card-title">👁 Vista previa en POS</div>
              <div className="card-sub">Así verá el cajero las formas de pago</div>
            </div>
            <div style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeMetodos.map(met => (
                <div key={met.id} style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ fontSize: 16 }}>{met.icon}</span>
                  {met.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 1 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Cuentas bancarias</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
            Próximamente · Conecta cuentas bancarias para registrar ingresos
          </div>
        </div>
      )}

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">{editId ? 'Editar' : 'Nueva'} forma de pago</div>
              <div className="modal-sub">Configura cómo aparece en el POS</div>
            </div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>

          <div className="modal-body">
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Nombre</label>
                <input
                  className="finput"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej: Efectivo, Tarjeta..."
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Icono (emoji)</label>
                <input
                  className="finput"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="💳"
                  maxLength={4}
                  style={{ fontSize: 20, textAlign: 'center' }}
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
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveMetodo}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfigMetodosSec
