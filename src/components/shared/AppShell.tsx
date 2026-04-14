// ═══════════════════════════════════════════════════════════════
//  AppShell — topbar + nav compartido por todos los módulos
//  Incluye: branding, usuario activo, estado de red, nav back
// ═══════════════════════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import type { ZytekUser, License } from '@/types'

interface Props {
  title:    string
  module:   string
  user?:    ZytekUser | null
  license?: License | null
  onLogout?: () => void
  children: React.ReactNode
  rightSlot?: React.ReactNode
}

export function AppShell({ title, module: mod, user, license, onLogout, children, rightSlot }: Props) {
  const [online, setOnline] = useState(true)
  const [time,   setTime]   = useState('')

  useEffect(() => {
    setOnline(navigator.onLine)
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))

    const tick = () => setTime(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }))
    tick(); const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Topbar */}
      <header className="h-[52px] bg-topbar border-b border-[var(--border)] flex items-center gap-3 px-4 shrink-0 z-50">
        {/* Back to launcher */}
        <Link href="/" className="w-7 h-7 bg-orange rounded-lg flex items-center justify-center font-serif font-black text-sm text-white hover:opacity-90 transition-opacity shrink-0">
          Z
        </Link>

        {/* Module title */}
        <div className="flex flex-col">
          <span className="font-serif font-bold text-[13px] text-text leading-none">{title}</span>
          <span className="font-mono text-[9px] text-[var(--text-dim)] leading-none tracking-widest mt-0.5">
            {mod.toUpperCase()}
          </span>
        </div>

        {/* Right slot (module-specific controls) */}
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}

        {/* Spacer */}
        <div className="ml-auto flex items-center gap-3">
          {/* Network status */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                background: online ? 'var(--green)' : 'var(--red)',
                boxShadow:  online ? '0 0 6px var(--green)' : '0 0 6px var(--red)'
              }}
            />
            <span className="font-mono text-[10px] text-[var(--text-dim)] hidden sm:block">
              {online ? 'online' : 'offline'}
            </span>
          </div>

          {/* Clock */}
          <span className="font-mono text-[11px] text-[var(--text-dim)] hidden md:block">{time}</span>

          {/* License plan badge */}
          {license && (
            <span className="badge b-blue hidden sm:inline-flex">
              {license.plan.toUpperCase()}
            </span>
          )}

          {/* User */}
          {user && (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={onLogout}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: user.color || 'var(--orange)' }}
              >
                {user.nombre.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-mono text-[10px] text-[var(--text-dim)] hidden md:block group-hover:text-red transition-colors">
                {user.nombre}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
