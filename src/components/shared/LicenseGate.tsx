'use client'
import { useState, useEffect, ReactNode } from 'react'
import type { License } from '@/types'

interface Props {
  moduleId:    string
  onActivated: (license: License) => void
  children:    ReactNode
}

const DEMO_KEYS = [
  { key: 'ZYTEK-DEMO-BASIC-2025', plan: 'Básico',     desc: 'POS · KDS · Mesero' },
  { key: 'ZYTEK-DEMO-PRO-2025',   plan: 'Pro',        desc: '+ Admin · CRM · Retail' },
  { key: 'ZYTEK-DEMO-ENT-2025',   plan: 'Enterprise', desc: 'Todo incluido' },
]

const ERROR_MSGS: Record<string, string> = {
  invalid_format:    'Formato inválido. Ej: ZYTEK-DEMO-PRO-2025',
  not_found:         'Clave no encontrada.',
  expired:           'Licencia expirada. Renueva tu plan.',
  inactive:          'Licencia suspendida.',
  // Don't block on module check at page level — shell already validated plan
  module_not_allowed:'Este módulo no está en tu plan actual.',
  server_error:      'Error del servidor. Intenta en unos segundos.',
  no_key:            'Ingresa tu clave de licencia.',
}

export function LicenseGate({ moduleId, onActivated, children }: Props) {
  const [license,  setLicense]  = useState<License | null>(null)
  const [key,      setKey]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem('zytek_license_key')
      : null
    if (saved) {
      // When navigating to a module page, validate without moduleId check
      // The shell already enforced the plan — no need to re-block here
      validateKey(saved, true, false)
    } else {
      setChecking(false)
    }
  }, [])

  async function validateKey(keyToValidate: string, silent = false, checkModule = true) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const body: Record<string, string> = { key: keyToValidate }
      // Only pass moduleId when explicitly checking module access (not on auto-load)
      if (checkModule && moduleId !== 'shell') {
        body.moduleId = moduleId
      }

      const res = await fetch('/api/license', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (data.ok) {
        localStorage.setItem('zytek_license_key', keyToValidate.trim().toUpperCase())
        setLicense(data.license)
        onActivated(data.license)
      } else {
        // On auto-load, if module check fails, still show wall but clear key
        if (!silent) {
          setError(ERROR_MSGS[data.reason] || `Error: ${data.reason}`)
        }
        localStorage.removeItem('zytek_license_key')
        setChecking(false)
      }
    } catch {
      if (!silent) setError('Error de conexión. Verifica que npm run dev esté corriendo.')
      setChecking(false)
    } finally {
      if (!silent) setLoading(false)
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0d0d0f' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#606070', letterSpacing: 2 }}>
          VERIFICANDO...
        </div>
      </div>
    )
  }

  if (license) return <>{children}</>

  // ── Activation wall ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: '#0d0d0f' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, background: '#ff7c20', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 24, color: '#fff', marginBottom: 12,
          }}>Z</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 20, color: '#f0f0f5' }}>ZytekOS</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#606070', letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' }}>
            {moduleId === 'shell' ? 'Activación requerida' : `Módulo: ${moduleId}`}
          </div>
        </div>

        <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 18, marginBottom: 10 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#606070', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Clave de licencia
          </div>
          <input
            type="text"
            value={key}
            autoFocus
            onChange={e => { setKey(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && validateKey(key, false, true)}
            placeholder="ZYTEK-DEMO-PRO-2025"
            style={{
              width: '100%', background: '#1e1e24',
              border: `1px solid ${error ? '#ff4757' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 7, padding: '11px 13px', color: '#f0f0f5',
              fontFamily: 'DM Mono, monospace', fontSize: 13, letterSpacing: 2,
              outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase',
            }}
          />
          {error && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#ff4757', marginTop: 7 }}>
              {error}
            </div>
          )}
        </div>

        <button
          onClick={() => validateKey(key, false, true)}
          disabled={loading || !key}
          style={{
            width: '100%', padding: 13,
            background: loading || !key ? '#222' : '#ff7c20',
            border: 'none', borderRadius: 9,
            color: loading || !key ? '#555' : '#fff',
            fontSize: 13, fontWeight: 700, cursor: loading || !key ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', marginBottom: 12,
          }}
        >
          {loading ? 'Validando...' : 'Activar ZytekOS'}
        </button>

        <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#606070', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Claves de prueba
          </div>
          {DEMO_KEYS.map((d, i) => (
            <div
              key={d.key}
              onClick={() => validateKey(d.key, false, false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px',
                cursor: 'pointer',
                borderBottom: i < DEMO_KEYS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#ff7c20', flex: 1 }}>{d.key}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, background: 'rgba(56,182,255,0.1)', color: '#38b6ff', padding: '2px 7px', borderRadius: 8 }}>{d.plan}</span>
              <span style={{ fontSize: 10, color: '#606070' }}>{d.desc}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#505060', marginTop: 12 }}>
          ¿No tienes clave?{' '}
          <a href="mailto:dfornerino.usa@gmail.com" style={{ color: '#ff7c20', textDecoration: 'none' }}>
            Contactar Zytek LLC
          </a>
        </p>
      </div>
    </div>
  )
}
