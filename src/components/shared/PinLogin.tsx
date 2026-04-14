// ═══════════════════════════════════════════════════════════════
//  PinLogin — Pantalla de login por PIN
//  Llama /api/auth en el servidor — nunca compara PINs en el cliente
// ═══════════════════════════════════════════════════════════════
'use client'
import { useState, useEffect, useRef } from 'react'
import type { ZytekUser } from '@/types'

interface Props {
  tenantId:    string
  tenantName?: string
  onSuccess:   (user: ZytekUser, token: string) => void
  minLevel?:   number  // 1=SuperAdmin ... 5=Mesero
}

export function PinLogin({ tenantId, tenantName, onSuccess, minLevel = 5 }: Props) {
  const [buffer,  setBuffer]  = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [shake,   setShake]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const MAX = 10
  const dots = Array.from({ length: MAX }, (_, i) => i < buffer.length ? '●' : '○')

  async function submit() {
    if (!buffer || loading) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin: buffer, tenantId }),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.user.nivel > minLevel) {
          triggerError('Nivel de acceso insuficiente')
        } else {
          sessionStorage.setItem('zytek_token', data.token)
          onSuccess(data.user, data.token)
        }
      } else {
        triggerError('PIN incorrecto')
      }
    } catch {
      triggerError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function triggerError(msg: string) {
    setError(msg); setBuffer(''); setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  function handleKey(k: string) {
    if (loading) return
    if (k === 'DEL') { setBuffer(b => b.slice(0, -1)); setError(''); return }
    if (k === 'OK')  { submit(); return }
    if (buffer.length >= MAX) return
    const next = buffer + k
    setBuffer(next); setError('')
    if (next.length >= 4) submit()   // auto-submit cuando tiene ≥4 dígitos
  }

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center">
      {/* Hidden real input for keyboard support */}
      <input
        ref={inputRef} type="password" className="sr-only"
        value={buffer} readOnly
        onKeyDown={e => {
          if (e.key === 'Backspace') handleKey('DEL')
          else if (e.key === 'Enter') handleKey('OK')
          else if (/^\d$/.test(e.key)) handleKey(e.key)
        }}
      />

      <div className={`flex flex-col items-center gap-6 ${shake ? 'animate-bounce' : ''}`}>
        {/* Logo */}
        <div className="w-14 h-14 bg-orange rounded-2xl flex items-center justify-center mb-2">
          <span className="font-serif font-black text-2xl text-white">Z</span>
        </div>
        <div className="text-center">
          <div className="font-serif font-bold text-xl text-text">ZytekOS</div>
          {tenantName && <div className="font-mono text-xs text-[var(--text-dim)] mt-0.5">{tenantName}</div>}
        </div>

        {/* PIN dots */}
        <div className="flex gap-3">
          {dots.map((d, i) => (
            <span key={i} className={`text-2xl transition-all ${d === '●' ? 'text-orange scale-110' : 'text-[var(--text-dim)]'}`}>
              {d}
            </span>
          ))}
        </div>

        {error && <p className="font-mono text-xs text-red animate-pulse">{error}</p>}
        {loading && <p className="font-mono text-xs text-[var(--text-dim)] animate-pulse">Verificando...</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-64">
          {['1','2','3','4','5','6','7','8','9','DEL','0','OK'].map(k => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              disabled={loading}
              className={`
                h-14 rounded-xl font-mono font-bold text-lg transition-all
                active:scale-95 disabled:opacity-40
                ${k === 'OK'
                  ? 'bg-orange text-white hover:opacity-90'
                  : k === 'DEL'
                  ? 'bg-surface2 text-[var(--text-dim)] hover:bg-surface3 hover:text-red'
                  : 'bg-surface2 text-text hover:bg-surface3'}
              `}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
