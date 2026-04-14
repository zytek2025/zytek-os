'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Métodos de Pago
// Match: sec-metodos (líneas 2434-2558)
// Cuentas bancarias · Formas de pago · Vista previa POS
// Archivo: src/components/admin/sections/ConfigMetodosSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles } from './types'
import type { MetodoPago } from '@/types/admin'
import { DEFAULT_METODOS_PAGO } from '@/types/admin'

type MetTab = 'formas' | 'cuentas' | 'preview'

export function ConfigMetodosSec({ colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const [tab, setTab] = useState<MetTab>('formas')
  const [metodos, setMetodos] = useState<MetodoPago[]>(DEFAULT_METODOS_PAGO)

  const toggleMetodo = (id: string) => {
    setMetodos(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m))
  }

  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <div style={S.sw(on)} onClick={onClick}><div style={S.swDot(on)} /></div>
  )

  return (
    <div>
      <div style={S.pageTitle}>🏦 Cuentas & Formas de Pago</div>
      <div style={S.pageSub}>Bancos · Cajas · Terminales · Formas de pago conectadas al POS</div>

      {/* KPIs — match líneas 2439-2443 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <div style={S.kpi}><div style={S.kpiLabel}>Formas de pago</div><div style={{ ...S.kpiVal, color: c.green }}>{metodos.filter(m => m.activo).length}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Activas en POS</div><div style={{ ...S.kpiVal, color: c.cyan }}>{metodos.filter(m => m.activo).length}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Inactivas</div><div style={{ ...S.kpiVal, color: c.textDim }}>{metodos.filter(m => !m.activo).length}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Total</div><div style={S.kpiVal}>{metodos.length}</div></div>
      </div>

      {/* Tabs — match líneas 2447-2451 */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${c.border}`, marginBottom: 14 }}>
        {([
          { id: 'formas' as MetTab, label: '💳 Formas de pago' },
          { id: 'cuentas' as MetTab, label: '🏦 Cuentas bancarias' },
          { id: 'preview' as MetTab, label: '👁 Vista previa POS' },
        ]).map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: tab === t.id ? c.orange : c.textDim,
            borderBottom: `2px solid ${tab === t.id ? c.orange : 'transparent'}`, transition: 'all 0.13s',
          }}>{t.label}</div>
        ))}
      </div>

      {/* ── Formas de pago ── */}
      {tab === 'formas' && (
        <>
          <div style={{ background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 14, fontSize: 12, color: c.textMid, lineHeight: 1.7 }}>
            💡 Cada forma de pago activa aparece en el POS al cobrar. Los 6 métodos de pago del sistema son configurables.
          </div>
          <div style={S.card}>
            <div style={S.cardHead}>
              <div><div style={S.cardTitle}>Formas de pago configuradas</div><div style={S.cardSub}>{metodos.filter(m => m.activo).length} activas</div></div>
            </div>
            <div style={{ padding: 0 }}>
              {metodos.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${c.border}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>ID: {m.id}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={S.badge(m.activo ? 'rgba(46,232,122,0.1)' : 'rgba(255,71,87,0.12)', m.activo ? c.green : c.red, m.activo ? 'rgba(46,232,122,0.25)' : 'rgba(255,71,87,0.25)')}>
                      {m.activo ? 'Activa' : 'Inactiva'}
                    </span>
                    <Switch on={m.activo} onClick={() => toggleMetodo(m.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button onClick={() => showToast('Métodos de pago guardados')} style={{ ...S.btn, ...S.btnPrimary }}>💾 Guardar</button>
          </div>
        </>
      )}

      {/* ── Cuentas bancarias ── */}
      {tab === 'cuentas' && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div><div style={S.cardTitle}>Cuentas bancarias registradas</div><div style={S.cardSub}>Asociar cuentas para cada forma de pago</div></div>
            <button style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nueva cuenta</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Banco</th><th style={S.th}>Tipo</th><th style={S.th}>Moneda</th><th style={S.th}>Número</th><th style={S.th}>Titular</th><th style={S.th}>Estado</th><th style={S.th}></th></tr></thead>
              <tbody>
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>Sin cuentas registradas · agrega una cuenta bancaria</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Preview POS ── match líneas 2499-2502 */}
      {tab === 'preview' && (
        <div style={S.card}>
          <div style={S.cardHead}><div><div style={S.cardTitle}>👁 Vista previa en POS</div><div style={S.cardSub}>Así verá el cajero las formas de pago al cobrar</div></div></div>
          <div style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {metodos.filter(m => m.activo).map(m => (
              <div key={m.id} style={{
                padding: '12px 16px', borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.surface2, cursor: 'pointer', textAlign: 'center', minWidth: 100,
                transition: 'all 0.13s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.orange; (e.currentTarget as HTMLElement).style.background = c.orangeDim }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.background = c.surface2 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.textMid }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
