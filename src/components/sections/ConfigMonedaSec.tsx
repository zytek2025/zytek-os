'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Moneda / Tasa de Cambio
// Match: sec-moneda (líneas 2421-2431)
// Archivo: src/components/admin/sections/ConfigMonedaSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles } from './types'

export function ConfigMonedaSec({ colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const [tasa, setTasa] = useState('36.50')
  const [historial] = useState([
    { fecha: '14/04/2026', tasa: '36.50', usuario: 'admin' },
    { fecha: '13/04/2026', tasa: '36.40', usuario: 'admin' },
    { fecha: '12/04/2026', tasa: '36.35', usuario: 'admin' },
  ])

  return (
    <div>
      <div style={S.pageTitle}>Moneda / Tasa de Cambio</div>

      {/* Input de tasa */}
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 14 }}>
          <div style={S.fgroup}>
            <label style={S.flabel}>TASA HOY ($1 USD)</label>
            <input type="number" step="0.01" value={tasa} onChange={e => setTasa(e.target.value)} style={{ ...S.finput, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: c.cyan }} />
          </div>
          <div style={{ ...S.fgroup, display: 'flex', justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end' }}>
            <button onClick={() => showToast('Tasa guardada')} style={{ ...S.btn, ...S.btnPrimary }}>💾 Guardar tasa</button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div style={S.card}>
        <div style={S.cardHead}><div style={S.cardTitle}>Historial</div></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Tasa</th><th style={S.th}>Usuario</th></tr></thead>
            <tbody>
              {historial.map((h, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>{h.fecha}</td>
                  <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", color: c.cyan }}>{h.tasa} Bs/$</td>
                  <td style={S.td}>{h.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
