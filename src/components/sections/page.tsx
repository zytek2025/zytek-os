// ─────────────────────────────────────────────────────────────
// ZytekOS — /erp (página del Admin ERP)
// Ruta: src/app/erp/page.tsx
// PIN screen → Admin con gates por licencia
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useCallback } from 'react'
import { Admin } from '@/components/admin/Admin'
import type { AdminSession } from '@/types/admin'
import type { PlanTier } from '@/lib/admin-gates'

// Colores del design system — match exacto con zytek-admin.html
const C = {
  bg: '#0a0a0f',
  surface2: '#1e1e24',
  border2: 'rgba(255,255,255,0.14)',
  text: '#f0f0f5',
  textDim: '#606070',
  orange: '#ff7c20',
  orangeDim: 'rgba(255,124,32,0.12)',
  red: '#ff4757',
}

export default function ERPPage() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Validar PIN contra API ──
  const validatePin = useCallback(async (enteredPin: string) => {
    setLoading(true)
    setError('')

    try {
      // Llama al API route del backend (nunca keys en frontend)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      })

      if (res.ok) {
        const data = await res.json()
        setSession({
          userId: data.userId || 'admin',
          userName: data.userName || 'Admin',
          userRole: data.userRole || 'Administrador',
          userAvatar: data.userAvatar || 'AD',
          avatarColor: data.avatarColor || C.orange,
          tenantId: data.tenantId || '',
          tenantName: data.tenantName || 'ZytekOS',
          plan: (data.plan || 'lite') as PlanTier,
        })
      } else {
        setError('PIN incorrecto')
        setPin('')
      }
    } catch (e) {
      // Fallback demo para desarrollo
      if (enteredPin === '1234') {
        setSession({
          userId: 'demo-admin',
          userName: 'Admin Demo',
          userRole: 'Administrador',
          userAvatar: 'AD',
          avatarColor: C.orange,
          tenantId: '00000000-0000-0000-0000-000000000001',
          tenantName: 'Demo Restaurant',
          plan: 'pro',  // Cambiar para probar gates: 'lite', 'pro', 'enterprise'
        })
      } else {
        setError('PIN incorrecto')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Tecla del PIN pad ──
  const handleKey = (key: number) => {
    if (pin.length >= 4) return
    const newPin = pin + key.toString()
    setPin(newPin)
    setError('')
  }

  const handleDel = () => {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const handleEnter = () => {
    if (pin.length < 4) {
      setError('PIN de 4 dígitos')
      return
    }
    validatePin(pin)
  }

  const handleLogout = () => {
    setSession(null)
    setPin('')
    setError('')
  }

  // ── Si ya está autenticado, mostrar Admin ──
  if (session) {
    return (
      <Admin
        session={session}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}
        onLogout={handleLogout}
        onBackToPOS={() => window.location.href = '/restaurant'}
      />
    )
  }

  // ── PIN SCREEN ── pixel-perfect match con líneas 357-376 ──
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 20, background: C.bg, color: C.text,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 32 }}>🔐</div>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: C.text }}>
            ADMIN — ZytekOS
          </div>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 3, color: C.textDim }}>
            ZYTEK CLOUD ERP
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 3,
        color: C.textDim, textTransform: 'uppercase',
      }}>
        INGRESA TU PIN DE ADMINISTRADOR
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', minHeight: 18 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i < pin.length ? C.orange : C.border2,
            transition: 'all 0.15s',
            transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
          }} />
        ))}
      </div>

      {/* Error */}
      <div style={{
        fontSize: 11, color: C.red, fontFamily: "'DM Mono', monospace",
        minHeight: 16, textAlign: 'center',
      }}>
        {error}
      </div>

      {/* PIN Pad — match exacto líneas 368-374 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 8 }}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
          <button key={n} onClick={() => handleKey(n)}
            onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.93)'; (e.currentTarget as HTMLElement).style.background = C.orangeDim }}
            onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.background = C.surface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.background = C.surface2 }}
            style={{
              width: 64, height: 64, borderRadius: 12, border: `1px solid ${C.border2}`,
              background: C.surface2, color: C.text, fontSize: 22, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Mono', monospace", transition: 'all 0.1s', userSelect: 'none',
            }}>
            {n}
          </button>
        ))}

        {/* Borrar */}
        <button onClick={handleDel} style={{
          width: 64, height: 64, borderRadius: 12, border: `1px solid ${C.border2}`,
          background: C.surface2, color: C.text, fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", transition: 'all 0.1s', userSelect: 'none',
        }}>
          ⌫
        </button>

        {/* 0 */}
        <button onClick={() => handleKey(0)} style={{
          width: 64, height: 64, borderRadius: 12, border: `1px solid ${C.border2}`,
          background: C.surface2, color: C.text, fontSize: 22, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", transition: 'all 0.1s', userSelect: 'none',
        }}>
          0
        </button>

        {/* Enter */}
        <button onClick={handleEnter} style={{
          width: 64, height: 64, borderRadius: 12, border: `1px solid ${C.orange}`,
          background: C.orange, color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", transition: 'all 0.1s', userSelect: 'none',
        }}>
          {loading ? '...' : '✓'}
        </button>
      </div>

      {/* Link volver al POS */}
      <a href="/restaurant" style={{
        fontSize: 11, color: C.textDim, marginTop: 16, textDecoration: 'none',
        fontFamily: "'DM Mono', monospace",
      }}>
        ← Volver al POS
      </a>
    </div>
  )
}
