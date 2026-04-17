'use client'
import { useState, useEffect } from 'react'
import type { AdminSession } from '@/types/admin'
import { PAIS_CONFIG, PAISES_LIST, readPaisLocal, writePaisLocal, type PaisId } from '@/lib/paises'
import '../admin.css'

interface Props {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: string
  colors: Record<string, string>
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export function ConfigGeneralSec({ session, showToast }: Props) {
  const [nombre, setNombre] = useState(session.tenantName || 'Mi Restaurante')
  const [pais, setPais] = useState<PaisId>('ve')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPais(readPaisLocal())
  }, [])

  const paisCfg = PAIS_CONFIG[pais]

  const handleSave = async () => {
    setLoading(true)
    try {
      await fetch(`${session.tenantId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_negocio: nombre, pais }),
      })
    } catch {
      // Continue
    }
    writePaisLocal(pais)
    setLoading(false)
    showToast('✅ Configuración guardada')
  }

  return (
    <>
      <div className="page-title">Configuración General</div>

      <div className="card">
        <div className="fgrid">
          <div className="fgroup full">
            <label className="flabel">Nombre del restaurante</label>
            <input
              className="finput"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi Restaurante"
            />
          </div>

          <div className="fgroup">
            <label className="flabel">País</label>
            <select
              className="fselect"
              value={pais}
              onChange={(e) => setPais(e.target.value as PaisId)}
            >
              {PAISES_LIST.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="fgroup">
            <label className="flabel">Moneda local</label>
            <input
              className="finput"
              value={`${paisCfg.moneda} (${paisCfg.simbolo})`}
              readOnly
              style={{ opacity: 0.6 }}
            />
          </div>

          {paisCfg.dual && (
            <div className="fgroup full">
              <label className="flabel">{paisCfg.tasaLabel}</label>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>
                País con doble moneda (local + USD). Configura la tasa en <b>Moneda / Tasa de Cambio</b>.
              </div>
            </div>
          )}

          <div className="fgroup full" style={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfigGeneralSec
