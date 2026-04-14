// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin License Gates
// Controla qué secciones del Admin son visibles según el plan
// Archivo: src/lib/admin-gates.ts
// ─────────────────────────────────────────────────────────────

export type PlanTier = 'lite' | 'basic' | 'pro' | 'enterprise'

// Cada sección del sidebar con su tier mínimo requerido
export interface SidebarSection {
  id: string
  icon: string
  label: string
  tier: PlanTier
  // Si es colapsable, tiene sub-items
  items?: SidebarItem[]
}

export interface SidebarItem {
  id: string
  icon: string
  label: string
  section: string  // ID del sec- que muestra en el content
  tier: PlanTier
}

// ── MAPA COMPLETO DEL SIDEBAR ──────────────────────────────
export const ADMIN_SIDEBAR: SidebarSection[] = [
  {
    id: 'sgrp-menu',
    icon: '🍽️',
    label: 'Menú de Ventas',
    tier: 'lite',
    items: [
      { id: 'nav-categorias',  icon: '🗂️', label: 'Categorías',      section: 'sec-categorias',  tier: 'lite' },
      { id: 'nav-subgrupos',   icon: '📐', label: 'Sub-grupos',      section: 'sec-subgrupos',   tier: 'lite' },
      { id: 'nav-items',       icon: '🍽️', label: 'Ítems / Platos',  section: 'sec-items',       tier: 'lite' },
      { id: 'nav-mod-grupos',  icon: '🔧', label: 'Grupos de Mods',  section: 'sec-mod-grupos',  tier: 'lite' },
      { id: 'nav-mod-items',   icon: '✏️', label: 'Modificadores',   section: 'sec-mod-items',   tier: 'lite' },
    ],
  },
  {
    id: 'sgrp-compras',
    icon: '🛒',
    label: 'Compras',
    tier: 'pro',
    items: [
      { id: 'nav-proveedores', icon: '🏭', label: 'Proveedores',     section: 'sec-compras-mod', tier: 'pro' },
    ],
  },
  {
    id: 'sgrp-inventario',
    icon: '📦',
    label: 'Inventario',
    tier: 'pro',
    items: [
      { id: 'nav-inventario',  icon: '📦', label: 'Productos',       section: 'sec-inventario-mod', tier: 'pro' },
    ],
  },
  {
    id: 'sgrp-reportes',
    icon: '📊',
    label: 'Reportes',
    tier: 'lite',
    items: [
      { id: 'nav-reportes',    icon: '📊', label: 'Reportes',        section: 'sec-reportes',    tier: 'lite' },
    ],
  },
  {
    id: 'sgrp-clientes',
    icon: '👥',
    label: 'Clientes',
    tier: 'pro',
    items: [
      { id: 'nav-directorio',   icon: '👥', label: 'Directorio',      section: 'sec-clientes',    tier: 'pro' },
      { id: 'nav-cxc',          icon: '💳', label: 'CxC — Créditos',  section: 'sec-creditos',    tier: 'pro' },
      { id: 'nav-abonos',       icon: '💵', label: 'Abonos',          section: 'sec-clientes',    tier: 'pro' },
      { id: 'nav-adelantos',    icon: '⬆️', label: 'Pagos adelantados', section: 'sec-clientes',  tier: 'pro' },
      { id: 'nav-leads',        icon: '🎯', label: 'Leads',           section: 'sec-clientes',    tier: 'pro' },
      { id: 'nav-fidelizacion', icon: '⭐', label: 'Fidelización',    section: 'sec-clientes',    tier: 'pro' },
    ],
  },
  {
    id: 'sgrp-ia',
    icon: '🤖',
    label: 'Inteligencia Artificial',
    tier: 'enterprise',
    items: [
      { id: 'nav-ia-inventario', icon: '📦', label: 'Control de Inventario', section: 'sec-ia-inventario', tier: 'enterprise' },
      { id: 'nav-ia-ventas',     icon: '📊', label: 'Análisis de Ventas',    section: 'sec-ia-ventas',     tier: 'enterprise' },
    ],
  },
  {
    id: 'sgrp-sistema',
    icon: '⚙️',
    label: 'Sistema',
    tier: 'pro',
    items: [
      { id: 'nav-usuarios',   icon: '👥', label: 'Usuarios',   section: 'sec-usuarios',   tier: 'pro' },
      { id: 'nav-permisos',   icon: '🔐', label: 'Permisos',   section: 'sec-permisos',   tier: 'pro' },
      { id: 'nav-auditoria',  icon: '📜', label: 'Auditoría',  section: 'sec-auditoria',  tier: 'pro' },
    ],
  },
  {
    id: 'sgrp-config',
    icon: '🔩',
    label: 'Configuración',
    tier: 'lite',
    items: [
      { id: 'nav-general',    icon: '⚙️', label: 'General',           section: 'sec-general',    tier: 'lite' },
      { id: 'nav-moneda',     icon: '💱', label: 'Moneda / Tasa',     section: 'sec-moneda',     tier: 'lite' },
      { id: 'nav-metodos',    icon: '💳', label: 'Métodos de Pago',   section: 'sec-metodos',    tier: 'lite' },
      { id: 'nav-impuestos',  icon: '📊', label: 'Impuestos',         section: 'sec-impuestos',  tier: 'pro' },
      { id: 'nav-pos',        icon: '🖥️', label: 'Punto de Venta',   section: 'sec-pos',        tier: 'lite' },
    ],
  },
]

// ── JERARQUÍA DE TIERS ─────────────────────────────────────
const TIER_LEVEL: Record<PlanTier, number> = {
  lite: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
}

// ── FUNCIONES DE GATE ──────────────────────────────────────

/**
 * Verifica si un plan tiene acceso a un tier requerido
 */
export function hasAccess(userTier: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[requiredTier]
}

/**
 * Filtra las secciones del sidebar según el plan del usuario
 * Las secciones bloqueadas se muestran con candado pero no son clickeables
 */
export function getVisibleSidebar(userTier: PlanTier): (SidebarSection & { locked: boolean; items?: (SidebarItem & { locked: boolean })[] })[] {
  return ADMIN_SIDEBAR.map(section => ({
    ...section,
    locked: !hasAccess(userTier, section.tier),
    items: section.items?.map(item => ({
      ...item,
      locked: !hasAccess(userTier, item.tier),
    })),
  }))
}

/**
 * Obtiene el color del tier para badges y UI
 */
export function getTierColor(tier: PlanTier): { bg: string; color: string; border: string; label: string } {
  switch (tier) {
    case 'lite':
      return { bg: 'rgba(159,225,203,0.12)', color: '#9FE1CB', border: 'rgba(159,225,203,0.3)', label: 'LITE' }
    case 'basic':
      return { bg: 'rgba(93,202,165,0.12)', color: '#5DCAA5', border: 'rgba(93,202,165,0.3)', label: 'BÁSICO' }
    case 'pro':
      return { bg: 'rgba(175,169,236,0.12)', color: '#AFA9EC', border: 'rgba(175,169,236,0.3)', label: 'PRO' }
    case 'enterprise':
      return { bg: 'rgba(239,159,39,0.12)', color: '#EF9F27', border: 'rgba(239,159,39,0.3)', label: 'ENTERPRISE' }
  }
}

/**
 * Obtiene la sección por defecto según el plan
 */
export function getDefaultSection(userTier: PlanTier): string {
  return 'sec-categorias' // Siempre disponible para todos los planes
}
