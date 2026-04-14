'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin ERP (Layout Principal)
// Un solo Admin para todos los tiers: Lite, Pro, Enterprise
// La licencia controla qué secciones se muestran
// Archivo: src/components/admin/Admin.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { getVisibleSidebar, getTierColor, hasAccess, getDefaultSection, type PlanTier } from '@/lib/admin-gates'
import type { AdminSession } from '@/types/admin'

// ── Importar secciones (lazy loading per tier) ──
// Fase 2: Lite
import { CategoriasSec } from './sections/CategoriasSec'
import { SubgruposSec } from './sections/SubgruposSec'
import { ItemsSec } from './sections/ItemsSec'
import { ModGruposSec } from './sections/ModGruposSec'
import { ModItemsSec } from './sections/ModItemsSec'
import { ReportesSec } from './sections/ReportesSec'
import { ConfigGeneralSec } from './sections/ConfigGeneralSec'
import { ConfigMonedaSec } from './sections/ConfigMonedaSec'
import { ConfigMetodosSec } from './sections/ConfigMetodosSec'
import { ConfigPOSSec } from './sections/ConfigPOSSec'
// Fase 3: Pro
// import { ComprasSec } from './sections/ComprasSec'
// import { InventarioSec } from './sections/InventarioSec'
// import { ClientesSec } from './sections/ClientesSec'
// import { UsuariosSec } from './sections/UsuariosSec'
// import { PermisosSec } from './sections/PermisosSec'
// import { AuditoriaSec } from './sections/AuditoriaSec'
// import { ImpuestosSec } from './sections/ImpuestosSec'
// Fase 4: Enterprise
// import { IAInventarioSec } from './sections/IAInventarioSec'
// import { IAVentasSec } from './sections/IAVentasSec'

interface AdminProps {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  onLogout: () => void
  onBackToPOS?: () => void
}

export function Admin({ session, supabaseUrl, supabaseKey, onLogout, onBackToPOS }: AdminProps) {
  // ── Estado ──
  const [activeSection, setActiveSection] = useState(getDefaultSection(session.plan))
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 'sgrp-menu': true })
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [clock, setClock] = useState({ time: '--:--', date: '--/--/----' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── Sidebar filtrado por licencia ──
  const sidebar = getVisibleSidebar(session.plan)

  // ── Colores del tema (pixel-perfect match con zytek-admin.html) ──
  const c = theme === 'dark' ? {
    bg: '#0a0a0f', surface: '#16161a', surface2: '#1e1e24', topbar: '#111114',
    border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
    text: '#f0f0f5', textMid: '#b0b0c0', textDim: '#606070',
    orange: '#ff7c20', orangeDim: 'rgba(255,124,32,0.12)', orangeB: 'rgba(255,124,32,0.3)',
    green: '#2ee87a', greenDim: 'rgba(46,232,122,0.1)',
    red: '#ff4757', blue: '#38b6ff',
    amber: '#ffc040', purple: '#a855f7', cyan: '#00d4ff',
  } : {
    bg: '#f4f4f8', surface: '#fff', surface2: '#f0f0f5', topbar: '#fff',
    border: 'rgba(0,0,0,0.1)', border2: 'rgba(0,0,0,0.18)',
    text: '#111118', textMid: '#444455', textDim: '#888899',
    orange: '#ff7c20', orangeDim: 'rgba(255,124,32,0.08)', orangeB: 'rgba(255,124,32,0.2)',
    green: '#1a9e5a', greenDim: 'rgba(26,158,90,0.08)',
    red: '#e03040', blue: '#2080d0',
    amber: '#c89030', purple: '#8040d0', cyan: '#0090c0',
  }

  // ── Reloj en tiempo real ──
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock({
        time: now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [])

  // ── Toast helper ──
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── Toggle grupo del sidebar ──
  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // ── Navegar a sección ──
  const navigateTo = (sectionId: string) => {
    setActiveSection(sectionId)
  }

  // ── Props compartidas que reciben todas las secciones ──
  const sectionProps = {
    session,
    supabaseUrl,
    supabaseKey,
    theme,
    colors: c,
    showToast,
  }

  // ── Router de secciones ──
  const renderSection = (): ReactNode => {
    switch (activeSection) {
      // Fase 2: Lite
      case 'sec-categorias':   return <CategoriasSec {...sectionProps} />
      case 'sec-subgrupos':    return <SubgruposSec {...sectionProps} />
      case 'sec-items':        return <ItemsSec {...sectionProps} />
      case 'sec-mod-grupos':   return <ModGruposSec {...sectionProps} />
      case 'sec-mod-items':    return <ModItemsSec {...sectionProps} />
      case 'sec-reportes':     return <ReportesSec {...sectionProps} />
      case 'sec-general':      return <ConfigGeneralSec {...sectionProps} />
      case 'sec-moneda':       return <ConfigMonedaSec {...sectionProps} />
      case 'sec-metodos':      return <ConfigMetodosSec {...sectionProps} />
      case 'sec-pos':          return <ConfigPOSSec {...sectionProps} />

      // Fase 3: Pro (placeholder hasta implementar)
      case 'sec-compras-mod':
      case 'sec-inventario-mod':
      case 'sec-clientes':
      case 'sec-creditos':
      case 'sec-usuarios':
      case 'sec-permisos':
      case 'sec-auditoria':
      case 'sec-impuestos':
        return <PlaceholderSec title="En desarrollo" tier="pro" colors={c} />

      // Fase 4: Enterprise
      case 'sec-ia-inventario':
      case 'sec-ia-ventas':
        return <PlaceholderSec title="En desarrollo" tier="enterprise" colors={c} />

      default:
        return <CategoriasSec {...sectionProps} />
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: c.bg, color: c.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── TOPBAR ── pixel-perfect match líneas 381-391 ── */}
      <div style={{
        height: 52, background: c.topbar, borderBottom: `2px solid ${c.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0,
      }}>
        {/* Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>🔐</div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 900, color: c.text }}>Panel Administrativo</div>
            <div style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", letterSpacing: 2, color: c.textDim }}>ZYTEK CLOUD ERP</div>
          </div>
        </div>

        {/* Spacer + acciones derechas */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Reloj */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: c.textDim }}>{clock.date}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: c.text }}>{clock.time}</div>
          </div>

          {/* Tema */}
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{
            width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`,
            background: 'transparent', color: c.amber, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Volver al POS */}
          {onBackToPOS && (
            <button onClick={onBackToPOS} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid ${c.border2}`,
              background: c.surface2, color: c.textMid, fontSize: 11, cursor: 'pointer',
              fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
              display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
            }}>
              🍽️ Ir al POS
            </button>
          )}

          {/* User chip */}
          <div onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
            borderRadius: 20, background: c.surface2, border: `1px solid ${c.border}`, cursor: 'pointer',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', background: session.avatarColor || c.orange,
            }}>
              {session.userAvatar || '?'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{session.userName}</div>
              <div style={{ fontSize: 9, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>{session.userRole}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: SIDEBAR + CONTENT ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── pixel-perfect match líneas 396-490 ── */}
        <div style={{
          width: 220, background: c.surface, borderRight: `1px solid ${c.border}`,
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
        }}>
          {sidebar.map(group => {
            const isOpen = openGroups[group.id] ?? false
            const hasItems = group.items && group.items.length > 1
            const tierInfo = group.locked ? getTierColor(group.tier) : null

            // Grupo con un solo item → renderizar como item directo
            if (group.items && group.items.length === 1) {
              const item = group.items[0]
              return (
                <div key={group.id} style={{ padding: '2px 8px' }}>
                  <div
                    onClick={() => !item.locked && navigateTo(item.section)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 6, cursor: item.locked ? 'default' : 'pointer',
                      color: activeSection === item.section ? c.orange : item.locked ? c.textDim : c.textMid,
                      fontSize: 12, fontWeight: 500, marginBottom: 1, transition: 'all 0.13s',
                      background: activeSection === item.section ? c.orangeDim : 'transparent',
                      border: activeSection === item.section ? `1px solid ${c.orangeB}` : '1px solid transparent',
                      opacity: item.locked ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 16, marginRight: 8 }}>{group.icon}</span>
                    {group.label}
                    {item.locked && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '1px 6px', borderRadius: 4, background: tierInfo?.bg, color: tierInfo?.color, border: `1px solid ${tierInfo?.border}` }}>
                        🔒 {tierInfo?.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            // Grupo colapsable con múltiples items
            return (
              <div key={group.id} style={{ padding: '2px 8px' }}>
                {/* Header del grupo */}
                <div
                  onClick={() => !group.locked && toggleGroup(group.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 6, cursor: group.locked ? 'default' : 'pointer',
                    color: isOpen ? c.textMid : c.textDim,
                    fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                    marginBottom: 1, userSelect: 'none', transition: 'all 0.13s',
                    opacity: group.locked ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{group.icon}</span>
                  {group.label}
                  {group.locked ? (
                    <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '1px 6px', borderRadius: 4, background: tierInfo?.bg, color: tierInfo?.color, border: `1px solid ${tierInfo?.border}`, letterSpacing: 0, textTransform: 'none', fontWeight: 600 }}>
                      🔒 {tierInfo?.label}
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 9, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: c.textDim }}>▼</span>
                  )}
                </div>

                {/* Items del grupo */}
                {!group.locked && (
                  <div style={{
                    overflow: 'hidden', maxHeight: isOpen ? 600 : 0,
                    transition: 'max-height 0.25s ease',
                  }}>
                    {group.items?.map(item => (
                      <div
                        key={item.id}
                        onClick={() => !item.locked && navigateTo(item.section)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', paddingLeft: 18,
                          borderRadius: 6, cursor: item.locked ? 'default' : 'pointer',
                          color: activeSection === item.section ? c.orange : item.locked ? c.textDim : c.textMid,
                          fontSize: 12, fontWeight: 500, marginBottom: 1, transition: 'all 0.13s',
                          background: activeSection === item.section ? c.orangeDim : 'transparent',
                          border: activeSection === item.section ? `1px solid ${c.orangeB}` : '1px solid transparent',
                          opacity: item.locked ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                        {item.locked && (() => {
                          const t = getTierColor(item.tier)
                          return <span style={{ marginLeft: 'auto', fontSize: 8, fontFamily: "'DM Mono', monospace", padding: '1px 5px', borderRadius: 3, background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>🔒</span>
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── CONTENT AREA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 0 }}>
          {renderSection()}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 8, fontWeight: 600,
          fontFamily: "'DM Mono', monospace", fontSize: 12, zIndex: 9999, whiteSpace: 'nowrap',
          background: toast.type === 'error' ? c.red : c.green,
          color: toast.type === 'error' ? '#fff' : '#000',
          animation: 'adminToastIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes adminToastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
      `}</style>
    </div>
  )
}

// ── PLACEHOLDER para secciones no implementadas ──
function PlaceholderSec({ title, tier, colors }: { title: string; tier: PlanTier; colors: any }) {
  const t = getTierColor(tier)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, opacity: 0.6 }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 }}>{title}</div>
      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '3px 10px', borderRadius: 5, background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
        Disponible en plan {t.label}
      </span>
    </div>
  )
}

export default Admin
