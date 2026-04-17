'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin ERP (Layout Principal)
// Un solo Admin para todos los tiers: Lite, Pro, Enterprise
// La licencia controla qué secciones se muestran
// Archivo: src/components/admin/Admin.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { getVisibleSidebar, getTierColor, getDefaultSection, hasAccess, type PlanTier } from '@/lib/admin-gates'
import type { AdminSession } from '@/types/admin'
import './admin.css'

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
import { ConfigImpuestosSec } from './sections/ConfigImpuestosSec'
// import { ComprasSec } from './sections/ComprasSec'
// import { InventarioSec } from './sections/InventarioSec'
// import { ClientesSec } from './sections/ClientesSec'
// import { UsuariosSec } from './sections/UsuariosSec'
// import { PermisosSec } from './sections/PermisosSec'
// import { AuditoriaSec } from './sections/AuditoriaSec'
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

  // ── Tema ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
    colors: {},
    showToast,
  }

  // ── Tier requerido por sección (derivado de ADMIN_SIDEBAR) ──
  const requiredTier = (sectionId: string): PlanTier => {
    for (const group of sidebar) {
      for (const item of group.items ?? []) {
        if (item.section === sectionId) return item.tier
      }
    }
    return 'lite'
  }

  // ── Router de secciones ──
  const renderSection = (): ReactNode => {
    const tier = requiredTier(activeSection)
    if (!hasAccess(session.plan, tier)) {
      return <PlaceholderSec title="Sección bloqueada" tier={tier} />
    }

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

      // Fase 3: Pro
      case 'sec-impuestos':    return <ConfigImpuestosSec {...sectionProps} />

      case 'sec-compras-mod':
      case 'sec-inventario-mod':
      case 'sec-clientes':
      case 'sec-creditos':
      case 'sec-usuarios':
      case 'sec-permisos':
      case 'sec-auditoria':
        return <PlaceholderSec title="En desarrollo" tier="pro" />

      // Fase 4: Enterprise
      case 'sec-ia-inventario':
      case 'sec-ia-ventas':
        return <PlaceholderSec title="En desarrollo" tier="enterprise" />

      default:
        return <CategoriasSec {...sectionProps} />
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="admin-app ready">

      {/* ── TOPBAR ── pixel-perfect match con zytek-admin.html */}
      <div className="topbar">
        {/* Marca */}
        <div className="brand">
          <span style={{ fontSize: 20 }}>🔐</span>
          <div>
            <div className="brand-name">Panel Administrativo</div>
            <div className="brand-sub">ZYTEK CLOUD ERP</div>
          </div>
        </div>

        {/* Spacer + acciones derechas */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Reloj */}
          <div className="dt-wrap">
            <div className="dt-date">{clock.date}</div>
            <div className="dt-time">{clock.time}</div>
          </div>

          {/* Tema */}
          <button className="theme-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Volver al POS */}
          {onBackToPOS && (
            <button className="back-btn" onClick={onBackToPOS}>
              🍽️ Ir al POS
            </button>
          )}

          {/* User chip */}
          <div className="user-chip" onClick={onLogout}>
            <div className="user-chip-av" style={{ background: session.avatarColor || 'var(--orange)' }}>
              {session.userAvatar || '?'}
            </div>
            <div>
              <div className="user-chip-name">{session.userName}</div>
              <div className="user-chip-role">{session.userRole}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: SIDEBAR + CONTENT ── */}
      <div className="admin-body-wrap">

        {/* ── SIDEBAR ── pixel-perfect match con zytek-admin.html */}
        <div className="admin-sidebar">
          {sidebar.map(group => {
            const isOpen = openGroups[group.id] ?? false
            const tierInfo = group.locked ? getTierColor(group.tier) : null

            // Grupo con un solo item → renderizar como item directo
            if (group.items && group.items.length === 1) {
              const item = group.items[0]
              return (
                <div key={group.id} className="sidebar-section">
                  <div
                    className={`sitem ${activeSection === item.section ? 'active' : ''}`}
                    onClick={() => !item.locked && navigateTo(item.section)}
                    style={{ opacity: item.locked ? 0.5 : 1 }}
                  >
                    <span className="sitem-icon">{group.icon}</span>
                    {group.label}
                    {item.locked && tierInfo && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        fontFamily: "'DM Mono', monospace",
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: tierInfo.bg,
                        color: tierInfo.color,
                        border: `1px solid ${tierInfo.border}`,
                      }}>
                        🔒 {tierInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            // Grupo colapsable con múltiples items
            return (
              <div key={group.id} className="sidebar-section">
                {/* Header del grupo */}
                <div
                  className={`sgroup-hdr ${isOpen ? 'open' : ''}`}
                  onClick={() => !group.locked && toggleGroup(group.id)}
                  style={{ opacity: group.locked ? 0.5 : 1 }}
                >
                  <span>{group.icon}</span>
                  {group.label}
                  {group.locked && tierInfo ? (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      fontFamily: "'DM Mono', monospace",
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: tierInfo.bg,
                      color: tierInfo.color,
                      border: `1px solid ${tierInfo.border}`,
                      letterSpacing: 0,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}>
                      🔒 {tierInfo.label}
                    </span>
                  ) : (
                    <span className="sgroup-arrow">▼</span>
                  )}
                </div>

                {/* Items del grupo */}
                {!group.locked && (
                  <div className={`sgroup-body ${isOpen ? 'open' : ''}`}>
                    {group.items?.map(item => (
                      <div
                        key={item.id}
                        className={`sitem ${activeSection === item.section ? 'active' : ''}`}
                        onClick={() => !item.locked && navigateTo(item.section)}
                        style={{ opacity: item.locked ? 0.5 : 1 }}
                      >
                        <span className="sitem-icon">{item.icon}</span>
                        {item.label}
                        {item.locked && (() => {
                          const t = getTierColor(item.tier)
                          return (
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: 8,
                              fontFamily: "'DM Mono', monospace",
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: t.bg,
                              color: t.color,
                              border: `1px solid ${t.border}`,
                            }}>
                              🔒
                            </span>
                          )
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
        <div className="admin-content">
          {renderSection()}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── PLACEHOLDER para secciones no implementadas ──
function PlaceholderSec({ title, tier }: { title: string; tier: PlanTier }) {
  const t = getTierColor(tier)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 16,
      opacity: 0.6,
    }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 }}>{title}</div>
      <span style={{
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        padding: '3px 10px',
        borderRadius: 5,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}>
        Disponible en plan {t.label}
      </span>
    </div>
  )
}

export default Admin
