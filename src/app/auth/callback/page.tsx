'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError('Token ausente. Vuelve a iniciar sesión.')
      return
    }

    // Llamar a la API de zytek-os para validar el handoff token
    fetch('/api/auth/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          router.replace('/')
        } else {
          setError(data.error || 'Error de autenticación.')
        }
      })
      .catch(() => setError('Error de conexión.'))
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#0d0d0f',
        fontFamily: 'DM Sans, sans-serif', gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ color: '#ff4757', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{error}</div>
        <a
          href={process.env.NEXT_PUBLIC_LANDING_URL || 'https://zytek.app'}
          style={{ color: '#ff7c20', fontSize: 12, textDecoration: 'none' }}
        >
          ← Volver a zytek.app
        </a>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0d0d0f', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, background: '#ff7c20', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 22, color: '#fff',
      }}>Z</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#606070', letterSpacing: 3 }}>
        VERIFICANDO SESIÓN...
      </div>
    </div>
  )
}
