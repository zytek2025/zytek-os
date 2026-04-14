// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin Section Props Interface
// Props compartidas que recibe cada sección
// Archivo: src/components/admin/sections/types.ts
// ─────────────────────────────────────────────────────────────
import type { AdminSession } from '@/types/admin'

export interface SectionProps {
  session: AdminSession
  supabaseUrl: string
  supabaseKey: string
  theme: 'dark' | 'light'
  colors: ThemeColors
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export interface ThemeColors {
  bg: string; surface: string; surface2: string; topbar: string
  border: string; border2: string
  text: string; textMid: string; textDim: string
  orange: string; orangeDim: string; orangeB: string
  green: string; greenDim: string
  red: string; blue: string; amber: string; purple: string; cyan: string
}

// ── Estilos compartidos generados desde los colores ──
export function getSharedStyles(c: ThemeColors) {
  return {
    pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 3 } as React.CSSProperties,
    pageSub: { fontSize: 11, color: c.textDim, fontFamily: "'DM Mono', monospace", marginBottom: 16 } as React.CSSProperties,
    card: { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' as const },
    cardHead: { display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: '11px 14px', borderBottom: `1px solid ${c.border}`, flexWrap: 'wrap' as const, gap: 8 },
    cardTitle: { fontSize: 12, fontWeight: 700, color: c.text },
    cardSub: { fontSize: 10, color: c.textDim, marginTop: 2 },
    btn: { padding: '6px 14px', borderRadius: 7, border: 'none' as const, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.13s', display: 'inline-flex' as const, alignItems: 'center' as const, gap: 5 } as React.CSSProperties,
    btnPrimary: { background: c.orange, color: '#fff' },
    btnGhost: { background: 'transparent', color: c.textMid, border: `1px solid ${c.border}` },
    btnRed: { background: 'rgba(255,71,87,0.12)', color: c.red, border: `1px solid rgba(255,71,87,0.25)` },
    btnBlue: { background: 'rgba(56,182,255,0.1)', color: c.blue, border: `1px solid rgba(56,182,255,0.25)` },
    btnSm: { padding: '4px 9px', fontSize: 10 },
    th: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: c.textDim, fontFamily: "'DM Mono', monospace", padding: '8px 12px', textAlign: 'left' as const, background: c.surface2, borderBottom: `1px solid ${c.border}` },
    td: { padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 12, color: c.textMid, verticalAlign: 'middle' as const },
    badge: (bg: string, color: string, border: string) => ({
      display: 'inline-flex' as const, alignItems: 'center' as const, fontSize: 10, fontFamily: "'DM Mono', monospace", padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: bg, color, border: `1px solid ${border}`,
    }),
    sw: (on: boolean) => ({
      width: 36, height: 20, borderRadius: 10, background: on ? c.orange : c.surface2, border: `1px solid ${on ? c.orange : c.border}`, position: 'relative' as const, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }),
    swDot: (on: boolean) => ({
      width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute' as const, top: 2, left: on ? 19 : 3, transition: 'left 0.2s',
    }),
    kpi: { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 14px' },
    kpiLabel: { fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: 'uppercase' as const, color: c.textDim, marginBottom: 4 },
    kpiVal: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: c.text },
    fgroup: { display: 'flex' as const, flexDirection: 'column' as const, gap: 4 },
    flabel: { fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase' as const, color: c.textDim },
    finput: { background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 6, padding: '7px 10px', color: c.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color 0.13s', width: '100%' },
    fselect: { background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 6, padding: '7px 10px', color: c.text, fontSize: 12, outline: 'none', width: '100%' },
    // Modal
    modalOverlay: { position: 'fixed' as const, inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 16 },
    modal: { background: c.surface, border: `1px solid ${c.border2}`, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' as const, animation: 'fadeIn 0.15s ease' },
    modalWide: { maxWidth: 780 },
    modalHead: { display: 'flex' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, padding: '16px 20px', borderBottom: `1px solid ${c.border}`, flexShrink: 0, gap: 10 },
    modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: c.text },
    modalSub: { fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace", marginTop: 2 },
    modalClose: { width: 26, height: 26, borderRadius: 6, background: c.surface2, border: `1px solid ${c.border}`, color: c.textMid, cursor: 'pointer', display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, fontSize: 13, flexShrink: 0 },
    modalBody: { padding: '18px 20px' },
    modalFoot: { padding: '12px 20px', borderTop: `1px solid ${c.border}`, display: 'flex' as const, gap: 8, justifyContent: 'flex-end' as const, flexWrap: 'wrap' as const, flexShrink: 0 },
    // Config rows
    cfgRow: { display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` },
    cfgName: { fontSize: 13, fontWeight: 600, color: c.text },
    cfgDesc: { fontSize: 10, color: c.textDim, marginTop: 2 },
    // Cat grid
    catCard: { background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.13s', textAlign: 'center' as const, position: 'relative' as const },
    catCardName: { fontSize: 12, fontWeight: 700, color: c.text },
    catCardSub: { fontSize: 9, color: c.textDim, fontFamily: "'DM Mono', monospace", marginTop: 2 },
  }
}

// ── Supabase fetch helper ──
export function createSbFetch(supabaseUrl: string, supabaseKey: string) {
  return async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
        ...(options?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }
}
