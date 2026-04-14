'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Configuración General
// Match: sec-general (líneas 2410-2418)
// Archivo: src/components/admin/sections/ConfigGeneralSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles } from './types'

export function ConfigGeneralSec({ colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const [nombre, setNombre] = useState('Mi Restaurante · Zytek Cloud ERP')
  const [pais, setPais] = useState('ve')

  const paises = [
    { id: 've', label: '🇻🇪 Venezuela' }, { id: 'ar', label: '🇦🇷 Argentina' },
    { id: 'mx', label: '🇲🇽 México' }, { id: 'co', label: '🇨🇴 Colombia' },
    { id: 'us', label: '🇺🇸 USA' }, { id: 'es', label: '🇪🇸 España' },
  ]

  return (
    <div>
      <div style={S.pageTitle}>Configuración General</div>
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 14 }}>
          <div style={{ ...S.fgroup, gridColumn: '1/-1' }}>
            <label style={S.flabel}>NOMBRE DEL RESTAURANTE</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={S.finput} />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>PAÍS</label>
            <select value={pais} onChange={e => setPais(e.target.value)} style={S.fselect}>
              {paises.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>MONEDA LOCAL</label>
            <input type="text" value={pais === 've' ? 'VES (Bs)' : pais === 'us' ? 'USD ($)' : 'Moneda local'} readOnly style={{ ...S.finput, opacity: 0.6 }} />
          </div>
          <div style={{ ...S.fgroup, gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', flexDirection: 'row' }}>
            <button onClick={() => showToast('Configuración guardada')} style={{ ...S.btn, ...S.btnPrimary }}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
