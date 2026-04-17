'use client'
import { useState, useEffect } from 'react'
import type { AdminSession } from '@/types/admin'
import { PAIS_CONFIG, readPaisLocal, readTasaLocal, writeTasaLocal } from '@/lib/paises'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

interface TasaEntry {
  fecha: string
  tasa: number
  usuario: string
}

export function ConfigMonedaSec({ session, showToast }: Props) {
  const paisCfg = PAIS_CONFIG[readPaisLocal()]
  const [tasa, setTasa] = useState(String(readTasaLocal() ?? paisCfg.tasaDefault))
  const [historial, setHistorial] = useState<TasaEntry[]>([])

  useEffect(() => {
    loadHistorial()
  }, [])

  const loadHistorial = async () => {
    try {
      const res = await fetch(`${session.tenantId}/tasas`)
      if (res.ok) setHistorial(await res.json())
    } catch {
      setHistorial([])
    }
  }

  const handleSave = async () => {
    const tasaNum = parseFloat(tasa) || 1
    try {
      await fetch(`${session.tenantId}/tasas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasa: tasaNum }),
      })
    } catch {
      // Continue
    }
    writeTasaLocal(tasaNum)
    setHistorial(prev => [
      {
        fecha: new Date().toLocaleDateString('es-VE'),
        tasa: tasaNum,
        usuario: session.userName,
      },
      ...prev,
    ])
    showToast('✅ Tasa actualizada')
  }

  return (
    <>
      <div className="page-title">Moneda / Tasa de Cambio</div>
      <div className="page-sub">{paisCfg.nombre} · {paisCfg.moneda} ({paisCfg.simbolo}) {paisCfg.dual ? `· ${paisCfg.tasaLabel}` : '· sin tasa (moneda única)'}</div>

      <div className="card" style={{ opacity: paisCfg.dual ? 1 : 0.5, pointerEvents: paisCfg.dual ? 'auto' : 'none' }}>
        <div className="fgrid">
          <div className="fgroup">
            <label className="flabel">Tasa hoy (1 USD → {paisCfg.simbolo})</label>
            <input
              className="finput"
              type="number"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              placeholder={String(paisCfg.tasaDefault)}
              step="0.01"
              min="0"
            />
          </div>

          <div className="fgroup full" style={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              💾 Guardar tasa
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Historial</div>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tasa</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((entry, i) => (
              <tr key={i}>
                <td style={{ fontFamily: "'DM Mono', monospace" }}>{entry.fecha}</td>
                <td style={{ fontFamily: "'DM Mono', monospace", color: 'var(--cyan)' }}>
                  {entry.tasa.toFixed(2)} Bs/$
                </td>
                <td>{entry.usuario}</td>
              </tr>
            ))}
            {historial.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '20px' }}>
                  Sin historial de tasas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ConfigMonedaSec
