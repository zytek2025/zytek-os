'use client'
import { useState, useEffect } from 'react'
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

interface Ambiente {
  id: string
  nombre: string
  emoji: string
  activo: boolean
}

interface Mesa {
  id: string
  nombre: string
  capacidad: number
  estado: 'libre' | 'ocupada' | 'reservada'
  forma?: 'rectangular' | 'redonda'
}

export function ConfigPOSSec({ session, showToast }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [ambientes, setAmbientes] = useState<Ambiente[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [selectedAmbiente, setSelectedAmbiente] = useState<Ambiente | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [ambNombre, setAmbNombre] = useState('')
  const [ambEmoji, setAmbEmoji] = useState('🏠')

  useEffect(() => {
    loadAmbientes()
  }, [])

  const loadAmbientes = async () => {
    try {
      const res = await fetch(`${session.tenantId}/ambientes`)
      if (res.ok) setAmbientes(await res.json())
    } catch {
      setAmbientes([])
    }
  }

  const loadMesas = async (ambId: string) => {
    try {
      const res = await fetch(`${session.tenantId}/ambientes/${ambId}/mesas`)
      if (res.ok) setMesas(await res.json())
    } catch {
      setMesas([])
    }
  }

  const selectAmbiente = (amb: Ambiente) => {
    setSelectedAmbiente(amb)
    loadMesas(amb.id)
  }

  const openAmbienteModal = (amb?: Ambiente) => {
    setAmbNombre(amb?.nombre ?? '')
    setAmbEmoji(amb?.emoji ?? '🏠')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const saveAmbiente = () => {
    if (!ambNombre.trim()) {
      showToast('⚠️ Ingresa el nombre', 'error')
      return
    }

    const data: Ambiente = {
      id: `amb_${Date.now()}`,
      nombre: ambNombre.trim(),
      emoji: ambEmoji,
      activo: true,
    }

    setAmbientes(prev => [...prev, data])
    setModalOpen(false)
    showToast('✅ Ambiente creado')
  }

  const generarMesasRapido = () => {
    if (!selectedAmbiente) return
    const count = 10
    const newMesas: Mesa[] = Array.from({ length: count }, (_, i) => ({
      id: `mesa_${Date.now()}_${i}`,
      nombre: `${i + 1}`,
      capacidad: 4,
      estado: 'libre',
    }))
    setMesas(newMesas)
    showToast(`✅ ${count} mesas generadas`)
  }

  return (
    <>
      <div className="page-title">Configuración del Punto de Venta</div>
      <div className="page-sub">Ambientes · Mesas · Estaciones KDS · Turnos y Caja</div>

      {/* Tabs */}
      <div className="tab-bar">
        <div className={`tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
          🗺️ Ambientes & Mesas
        </div>
        <div className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          🖥️ Estaciones KDS
        </div>
        <div className={`tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
          🕐 Turnos & Caja
        </div>
      </div>

      {activeTab === 0 && (
        <>
          {/* Ambientes */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Ambientes</div>
                <div className="card-sub">{ambientes.length} ambientes</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => openAmbienteModal()}>
                + Nuevo ambiente
              </button>
            </div>

            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ambientes.map(amb => (
                <div
                  key={amb.id}
                  onClick={() => selectAmbiente(amb)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${selectedAmbiente?.id === amb.id ? 'var(--orange)' : 'var(--border)'}`,
                    background: selectedAmbiente?.id === amb.id ? 'var(--orange-dim)' : 'var(--surface2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.13s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{amb.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{amb.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      {amb.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                </div>
              ))}

              {ambientes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                  Sin ambientes · Crea el primero
                </div>
              )}
            </div>
          </div>

          {/* Mesas */}
          {selectedAmbiente && (
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">
                    Mesas — {selectedAmbiente.emoji} {selectedAmbiente.nombre}
                  </div>
                  <div className="card-sub">{mesas.length} mesas</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={generarMesasRapido}>
                    ⚡ Generar 10 mesas
                  </button>
                  <button className="btn btn-ghost btn-sm">+ Una mesa</button>
                </div>
              </div>

              <div style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {mesas.map(mesa => (
                  <div
                    key={mesa.id}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: mesa.forma === 'redonda' ? '50%' : 8,
                      border: `2px solid ${mesa.estado === 'libre' ? 'var(--green-b)' : mesa.estado === 'ocupada' ? 'var(--red-b)' : 'var(--amber-b)'}`,
                      background: 'var(--surface2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontFamily: "'DM Mono', monospace",
                      color: 'var(--text-mid)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{mesa.nombre}</div>
                    <div style={{ fontSize: 9 }}>{mesa.capacidad}p</div>
                  </div>
                ))}

                {mesas.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, width: '100%' }}>
                    Sin mesas · Usa "Generar 10 mesas" para crear rápidamente
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 1 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Estaciones KDS</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
            🍳 Cocina Principal · 🔥 Horno/Pizzas · 🍹 Barra · 🥗 Estación Fría
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Turnos & Caja</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
            Configura los turnos de tu negocio y los parámetros de caja
          </div>
        </div>
      )}

      {/* MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="modal-title">Nuevo Ambiente</div>
              <div className="modal-sub">Área física del restaurante (ej: salón, terraza, VIP)</div>
            </div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>

          <div className="modal-body">
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Nombre</label>
                <input
                  className="finput"
                  value={ambNombre}
                  onChange={(e) => setAmbNombre(e.target.value)}
                  placeholder="Ej: Salón principal, Terraza..."
                />
              </div>

              <div className="fgroup">
                <label className="flabel">Icono</label>
                <input
                  className="finput"
                  value={ambEmoji}
                  onChange={(e) => setAmbEmoji(e.target.value)}
                  placeholder="🏠"
                  maxLength={4}
                  style={{ fontSize: 20, textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveAmbiente}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfigPOSSec
