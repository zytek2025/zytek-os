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

const CATEGORIAS = [
  { id: 'home', emoji: '🏠', label: 'Inicio' },
  { id: 'ventas', emoji: '💰', label: 'Ventas' },
  { id: 'menu', emoji: '🍽️', label: 'Menú' },
  { id: 'mesas', emoji: '🪑', label: 'Mesas' },
  { id: 'personal', emoji: '👤', label: 'Personal' },
  { id: 'compras', emoji: '🛒', label: 'Compras' },
  { id: 'inventario', emoji: '📦', label: 'Inventario' },
  { id: 'fiscal', emoji: '🧾', label: 'Fiscal' },
  { id: 'marketing', emoji: '📣', label: 'Marketing' },
  { id: 'financiero', emoji: '📊', label: 'Financiero' },
]

export function ReportesSec({ session, showToast }: Props) {
  const [activeCat, setActiveCat] = useState('home')
  const [dateRange, setDateRange] = useState<'hoy' | 'semana' | 'mes'>('hoy')

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveCat('home')}
          style={{
            background: 'none',
            border: 'none',
            color: activeCat === 'home' ? 'var(--text)' : 'var(--text-dim)',
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            cursor: 'pointer',
            padding: 0,
            fontWeight: activeCat === 'home' ? 600 : 400,
          }}
        >
          📊 Reportes
        </button>
        {activeCat !== 'home' && (
          <>
            <span style={{ color: 'var(--border2)', fontSize: 12 }}>›</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {CATEGORIAS.find(c => c.id === activeCat)?.emoji}{' '}
              {CATEGORIAS.find(c => c.id === activeCat)?.label}
            </span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            className={`rep-range-btn ${dateRange === 'hoy' ? 'active' : ''}`}
            onClick={() => setDateRange('hoy')}
          >
            Hoy
          </button>
          <button
            className={`rep-range-btn ${dateRange === 'semana' ? 'active' : ''}`}
            onClick={() => setDateRange('semana')}
          >
            Semana
          </button>
          <button
            className={`rep-range-btn ${dateRange === 'mes' ? 'active' : ''}`}
            onClick={() => setDateRange('mes')}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Category Nav */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            className={`rep-nav-pill ${activeCat === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Home */}
      {activeCat === 'home' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div className="rep-home-card" onClick={() => setActiveCat('ventas')}>
            <div className="rep-home-ico">💰</div>
            <div className="rep-home-title">Ventas</div>
            <div className="rep-home-desc">Ingresos, tickets, formas de pago y tendencias</div>
            <div className="rep-home-count">10 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('menu')}>
            <div className="rep-home-ico">🍽️</div>
            <div className="rep-home-title">Menú</div>
            <div className="rep-home-desc">Top sellers, margen, productos lentos</div>
            <div className="rep-home-count">5 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('mesas')}>
            <div className="rep-home-ico">🪑</div>
            <div className="rep-home-title">Mesas</div>
            <div className="rep-home-desc">Ocupación, rotación, ticket promedio</div>
            <div className="rep-home-count">6 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('personal')}>
            <div className="rep-home-ico">👤</div>
            <div className="rep-home-title">Personal</div>
            <div className="rep-home-desc">Rendimiento, propinas, auditorías</div>
            <div className="rep-home-count">5 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('compras')}>
            <div className="rep-home-ico">🛒</div>
            <div className="rep-home-title">Compras</div>
            <div className="rep-home-desc">Proveedores · CxP · órdenes · food cost</div>
            <div className="rep-home-count">8 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('inventario')}>
            <div className="rep-home-ico">📦</div>
            <div className="rep-home-title">Inventario</div>
            <div className="rep-home-desc">Stock, alertas, movimientos, valorización</div>
            <div className="rep-home-count">5 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('fiscal')}>
            <div className="rep-home-ico">🧾</div>
            <div className="rep-home-title">Fiscal & Cierres</div>
            <div className="rep-home-desc">Cortes X/Z, IVA, IGTF, declaraciones</div>
            <div className="rep-home-count">5 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('marketing')}>
            <div className="rep-home-ico">📣</div>
            <div className="rep-home-title">Marketing</div>
            <div className="rep-home-desc">Clientes top, fidelización, retención</div>
            <div className="rep-home-count">3 reportes</div>
          </div>

          <div className="rep-home-card" onClick={() => setActiveCat('financiero')}>
            <div className="rep-home-ico">📊</div>
            <div className="rep-home-title">Financiero</div>
            <div className="rep-home-desc">P&L, flujo de caja, costos vs ingresos</div>
            <div className="rep-home-count">2 reportes</div>
          </div>
        </div>
      )}

      {/* Ventas */}
      {activeCat === 'ventas' && (
        <div>
          <div className="rep-dash-hdr">
            <div>
              <div className="rep-dash-title">💰 Ventas</div>
              <div className="rep-dash-sub">Resumen de ingresos, formas de cobro, turnos y rendimiento del equipo</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
            <div className="rep-dash-kpi">
              <div className="rep-dash-kpi-label">Ventas brutas</div>
              <div className="rep-dash-kpi-val" style={{ color: 'var(--green)' }}>$0.00</div>
              <div className="rep-dash-kpi-delta">—</div>
            </div>
            <div className="rep-dash-kpi">
              <div className="rep-dash-kpi-label">Tickets</div>
              <div className="rep-dash-kpi-val">0</div>
              <div className="rep-dash-kpi-delta">—</div>
            </div>
            <div className="rep-dash-kpi">
              <div className="rep-dash-kpi-label">Ticket prom.</div>
              <div className="rep-dash-kpi-val">$0.00</div>
              <div className="rep-dash-kpi-delta">—</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">R01 · Resumen del período</div>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '30px' }}>
                Conecta tu base de datos para ver los reportes de ventas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other categories - placeholder */}
      {activeCat !== 'home' && activeCat !== 'ventas' && (
        <div>
          <div className="rep-dash-hdr">
            <div>
              <div className="rep-dash-title">
                {CATEGORIAS.find(c => c.id === activeCat)?.emoji}{' '}
                {CATEGORIAS.find(c => c.id === activeCat)?.label}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Reporte en desarrollo</div>
            </div>
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
              🚧 Esta sección está siendo implementada · Pronto disponible
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ReportesSec
