'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Reportes
// Match: sec-reportes (líneas 622-744)
// Home con tarjetas de acceso + dashboards por categoría
// Con gates: Lite ve ventas/menú/fiscal, Pro ve todo
// Archivo: src/components/admin/sections/ReportesSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'
import { hasAccess } from '@/lib/admin-gates'
import type { Venta, CierreZ } from '@/types/admin'

type RepCat = 'home' | 'ventas' | 'menu' | 'fiscal' | 'mesas' | 'personal' | 'compras' | 'inventario' | 'marketing' | 'financiero'
type Rango = 'hoy' | 'semana' | 'mes' | 'custom'

const REP_CARDS = [
  { id: 'ventas' as RepCat, icon: '💰', title: 'Ventas', desc: 'KPIs · formas de pago · por hora', count: '8 reportes', tier: 'lite' as const },
  { id: 'menu' as RepCat, icon: '🍽️', title: 'Menú & Platos', desc: 'Más vendidos · por categoría · sin movimiento', count: '5 reportes', tier: 'lite' as const },
  { id: 'fiscal' as RepCat, icon: '🧾', title: 'Fiscal & Cierres', desc: 'Corte X/Z · IVA · comprobantes', count: '5 reportes', tier: 'lite' as const },
  { id: 'mesas' as RepCat, icon: '🪑', title: 'Mesas', desc: 'Rotación · tiempo promedio · ocupación', count: '4 reportes', tier: 'pro' as const },
  { id: 'personal' as RepCat, icon: '👤', title: 'Personal', desc: 'Rendimiento · ventas por cajero · propinas', count: '4 reportes', tier: 'pro' as const },
  { id: 'compras' as RepCat, icon: '🛒', title: 'Compras', desc: 'Proveedores · CxP · food cost', count: '12 reportes', tier: 'pro' as const },
  { id: 'inventario' as RepCat, icon: '📦', title: 'Inventario', desc: 'Stock · movimientos · ajustes', count: '5 reportes', tier: 'pro' as const },
  { id: 'marketing' as RepCat, icon: '📣', title: 'Marketing', desc: 'Clientes top · fidelización · retención', count: '3 reportes', tier: 'pro' as const },
  { id: 'financiero' as RepCat, icon: '📊', title: 'Financiero', desc: 'P&L · flujo de caja · costos vs ingresos', count: '2 reportes', tier: 'enterprise' as const },
]

const METODOS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'zelle', label: 'Zelle', icon: '📱' },
  { id: 'pago_movil', label: 'Pago Móvil', icon: '📲' },
  { id: 'divisas', label: 'Divisas', icon: '💲' },
  { id: 'transferencia', label: 'Transferencia', icon: '🏦' },
]

function getDateRange(rango: Rango, desde?: string, hasta?: string) {
  const now = new Date()
  let s: Date, e: Date
  if (rango === 'hoy') { s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) }
  else if (rango === 'semana') { const d = now.getDay(); s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d); e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - d), 23, 59, 59) }
  else if (rango === 'mes') { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) }
  else { s = desde ? new Date(desde + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate()); e = hasta ? new Date(hasta + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) }
  return { start: s.toISOString(), end: e.toISOString() }
}

export function ReportesSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)

  const [cat, setCat] = useState<RepCat>('home')
  const [rango, setRango] = useState<Rango>('hoy')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cierres, setCierres] = useState<CierreZ[]>([])
  const [loading, setLoading] = useState(false)
  const [showCierre, setShowCierre] = useState(false)
  const [cierreEfectivo, setCierreEfectivo] = useState('')

  // ── Cargar datos ──
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(rango, customDesde, customHasta)
      const [v, cz] = await Promise.all([
        sbFetch(`ventas?tenant_id=eq.${session.tenantId}&created_at=gte.${start}&created_at=lte.${end}&select=*&order=created_at.desc`),
        sbFetch(`cierres_z?tenant_id=eq.${session.tenantId}&select=*&order=created_at.desc&limit=30`),
      ])
      setVentas(Array.isArray(v) ? v : [])
      setCierres(Array.isArray(cz) ? cz : [])
    } catch (e) { showToast('Error cargando datos', 'error') }
    finally { setLoading(false) }
  }, [rango, customDesde, customHasta, session.tenantId])

  useEffect(() => { if (cat !== 'home') loadData() }, [cat, rango, customDesde, customHasta])

  // ── KPIs ──
  const totalVentas = ventas.reduce((t, v) => t + (v.total || 0), 0)
  const totalTx = ventas.length
  const ticketProm = totalTx > 0 ? totalVentas / totalTx : 0
  const totalItems = ventas.reduce((t, v) => t + (v.items?.reduce((s, i) => s + (i.cantidad || 1), 0) || 0), 0)

  // ── Desglose métodos ──
  const desglose: Record<string, { count: number; total: number }> = {}
  ventas.forEach(v => { const m = v.payment_method || 'efectivo'; if (!desglose[m]) desglose[m] = { count: 0, total: 0 }; desglose[m].count++; desglose[m].total += v.total || 0 })

  // ── Top sellers ──
  const topSellers = (() => {
    const agg: Record<string, { name: string; qty: number; total: number }> = {}
    ventas.forEach(v => v.items?.forEach(i => { const k = i.id || i.nombre; if (!agg[k]) agg[k] = { name: i.nombre, qty: 0, total: 0 }; agg[k].qty += i.cantidad || 1; agg[k].total += i.subtotal || i.precio * (i.cantidad || 1) }))
    return Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 10)
  })()

  // ── Cierre Z ──
  const ejecutarCierre = async () => {
    const efectivoReal = parseFloat(cierreEfectivo) || 0
    const desgloseM: Record<string, number> = {}
    let totalEf = 0
    ventas.forEach(v => { const m = v.payment_method || 'efectivo'; desgloseM[m] = (desgloseM[m] || 0) + (v.total || 0); if (m === 'efectivo') totalEf += v.total || 0 })

    try {
      const cierre = {
        id: crypto.randomUUID?.() || `cz_${Date.now()}`, tenant_id: session.tenantId,
        fecha: new Date().toISOString().split('T')[0], total_ventas: totalVentas, total_transacciones: totalTx,
        desglose_metodos: desgloseM, efectivo_esperado: totalEf, efectivo_real: efectivoReal,
        diferencia: efectivoReal - totalEf, cajero: session.userName, created_at: new Date().toISOString(),
      }
      await sbFetch('cierres_z', { method: 'POST', body: JSON.stringify(cierre) })
      setCierres(prev => [cierre as CierreZ, ...prev])
      setShowCierre(false); setCierreEfectivo('')
      showToast('Cierre realizado exitosamente')
    } catch (e) { showToast('Error en cierre', 'error') }
  }

  const fmtM = (n: number) => `$${n.toFixed(2)}`
  const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
  const fmtDT = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + fmtT(iso)

  // ── Filtro pills — match líneas 641-652 ──
  const RepNav = () => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      {[{ id: 'home', label: '🏠 Inicio' }, ...REP_CARDS.map(r => ({ id: r.id, label: `${r.icon} ${r.title}` }))].map(item => {
        const repCard = REP_CARDS.find(r => r.id === item.id)
        const locked = repCard ? !hasAccess(session.plan, repCard.tier) : false
        return (
          <button key={item.id} onClick={() => !locked && setCat(item.id as RepCat)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${cat === item.id ? c.orange : c.border}`,
            background: cat === item.id ? c.orangeDim : 'transparent',
            color: cat === item.id ? c.orange : locked ? c.textDim : c.textMid,
            fontSize: 11, fontWeight: 600, cursor: locked ? 'default' : 'pointer', whiteSpace: 'nowrap',
            opacity: locked ? 0.4 : 1, fontFamily: "'DM Mono', monospace",
          }}>
            {item.label}{locked ? ' 🔒' : ''}
          </button>
        )
      })}
    </div>
  )

  // ── Barra de filtros — match líneas 655-670 ──
  const FilterBar = () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['hoy', 'semana', 'mes', 'custom'] as Rango[]).map(r => (
          <button key={r} onClick={() => setRango(r)} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${rango === r ? c.orange : c.border}`,
            background: rango === r ? c.orange : 'transparent', color: rango === r ? '#fff' : c.textDim,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Mono', monospace",
          }}>
            {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Semana' : r === 'mes' ? 'Mes' : 'Rango'}
          </button>
        ))}
      </div>
      {rango === 'custom' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)} style={{ ...S.finput, width: 'auto', padding: '5px 10px', fontSize: 11 }} />
          <span style={{ fontSize: 11, color: c.textDim }}>→</span>
          <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)} style={{ ...S.finput, width: 'auto', padding: '5px 10px', fontSize: 11 }} />
        </div>
      )}
      <div style={{ marginLeft: 'auto' }}>
        <button onClick={() => setShowCierre(true)} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>🔒 Cierre de Caja</button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Sticky nav — match línea 625 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: c.bg, paddingBottom: 12, marginBottom: 4 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setCat('home')} style={{ background: 'none', border: 'none', color: c.textDim, fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>📊 Reportes</button>
          {cat !== 'home' && <span style={{ color: c.border2, fontSize: 12 }}>›</span>}
          {cat !== 'home' && <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{REP_CARDS.find(r => r.id === cat)?.title}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>⬇ PDF</button>
            <button style={{ ...S.btn, ...S.btnGhost, ...S.btnSm }}>⬇ Excel</button>
          </div>
        </div>
        <RepNav />
        {cat !== 'home' && <FilterBar />}
      </div>

      {/* ═══ HOME: Índice de reportes ═══ match líneas 674-743 */}
      {cat === 'home' && (
        <div>
          <div style={S.pageTitle}>Reportes</div>
          <div style={{ ...S.pageSub, marginBottom: 20 }}>Selecciona una categoría para ver su dashboard</div>

          {/* KPIs globales rápidos — match líneas 679-685 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            <div style={S.kpi}><div style={S.kpiLabel}>Ventas hoy</div><div style={{ ...S.kpiVal, color: c.green }}>{fmtM(totalVentas)}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Tickets</div><div style={S.kpiVal}>{totalTx}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Ticket prom.</div><div style={S.kpiVal}>{fmtM(ticketProm)}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Items vendidos</div><div style={{ ...S.kpiVal, color: c.amber }}>{totalItems}</div></div>
          </div>

          {/* Tarjetas de acceso — match líneas 688-743 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {REP_CARDS.map(card => {
              const locked = !hasAccess(session.plan, card.tier)
              return (
                <div key={card.id} onClick={() => !locked && setCat(card.id)} style={{
                  background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10,
                  padding: 16, cursor: locked ? 'default' : 'pointer', transition: 'all 0.13s',
                  opacity: locked ? 0.4 : 1,
                }} onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLElement).style.borderColor = c.orange }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>{card.title}{locked ? ' 🔒' : ''}</div>
                  <div style={{ fontSize: 10, color: c.textDim, lineHeight: 1.4, marginBottom: 8 }}>{card.desc}</div>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: c.textMid }}>{card.count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ VENTAS DASHBOARD ═══ */}
      {cat === 'ventas' && (
        <div>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            <div style={S.kpi}><div style={S.kpiLabel}>Total ventas</div><div style={{ ...S.kpiVal, color: c.green }}>{fmtM(totalVentas)}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Transacciones</div><div style={S.kpiVal}>{totalTx}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Ticket promedio</div><div style={{ ...S.kpiVal, color: c.orange }}>{fmtM(ticketProm)}</div></div>
            <div style={S.kpi}><div style={S.kpiLabel}>Items vendidos</div><div style={{ ...S.kpiVal, color: c.blue }}>{totalItems}</div></div>
          </div>

          {/* Tabla de ventas */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <div><div style={S.cardTitle}>Lista de Ventas</div><div style={S.cardSub}>{ventas.length} venta{ventas.length !== 1 ? 's' : ''}</div></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={S.th}>Hora</th><th style={S.th}>Pedido</th><th style={S.th}>Método</th><th style={S.th}>Items</th><th style={S.th}>Total</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 30 }}>Cargando...</td></tr>}
                  {!loading && ventas.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin ventas en este período</td></tr>}
                  {ventas.slice(0, 100).map(v => {
                    const met = METODOS.find(m => m.id === (v.payment_method || 'efectivo'))
                    const items = v.items?.reduce((t, i) => t + (i.cantidad || 1), 0) || 0
                    return (
                      <tr key={v.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                        <td style={S.td}>{fmtT(v.created_at)}</td>
                        <td style={S.td}><span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: c.orange }}>{v.numero_pedido || '—'}</span></td>
                        <td style={S.td}><span style={S.badge(c.blue + '1a', c.blue, c.blue + '40')}>{met?.icon} {met?.label || v.payment_method}</span></td>
                        <td style={S.td}>{items} item{items !== 1 ? 's' : ''}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: c.green, fontFamily: "'DM Mono', monospace" }}>{fmtM(v.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desglose por método */}
          {Object.keys(desglose).length > 0 && (
            <div style={S.card}>
              <div style={S.cardHead}><div style={S.cardTitle}>Desglose por Método de Pago</div></div>
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {Object.entries(desglose).map(([method, data]) => {
                  const met = METODOS.find(m => m.id === method)
                  const pct = totalVentas > 0 ? ((data.total / totalVentas) * 100).toFixed(1) : '0'
                  return (
                    <div key={method} style={{ background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{met?.icon || '💰'}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{met?.label || method}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color: c.green, marginTop: 4 }}>{fmtM(data.total)}</div>
                      <div style={{ fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>{data.count} trans. · {pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MENÚ DASHBOARD ═══ */}
      {cat === 'menu' && (
        <div style={S.card}>
          <div style={S.cardHead}><div><div style={S.cardTitle}>Más Vendidos</div><div style={S.cardSub}>{topSellers.length} productos</div></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: 12 }}>
            {topSellers.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: c.textDim, gridColumn: '1/-1' }}>Sin datos en este período</div>}
            {topSellers.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: c.orange, width: 24, textAlign: 'center' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>{item.qty} vendidos</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.green, fontFamily: "'DM Mono', monospace" }}>{fmtM(item.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ FISCAL & CIERRES ═══ */}
      {cat === 'fiscal' && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div><div style={S.cardTitle}>Historial de Cierres (Corte Z)</div><div style={S.cardSub}>{cierres.length} cierres</div></div>
            <button onClick={() => setShowCierre(true)} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>🔒 Nuevo Cierre</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Ventas</th><th style={S.th}>Trans.</th><th style={S.th}>Efect. esperado</th><th style={S.th}>Efect. real</th><th style={S.th}>Diferencia</th><th style={S.th}>Cajero</th></tr></thead>
              <tbody>
                {cierres.length === 0 && <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 30, color: c.textDim }}>Sin cierres</td></tr>}
                {cierres.map(cz => (
                  <tr key={cz.id} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,124,32,0.03)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <td style={S.td}>{fmtDT(cz.created_at)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: c.green, fontFamily: "'DM Mono', monospace" }}>{fmtM(cz.total_ventas)}</td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>{cz.total_transacciones}</td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>{fmtM(cz.efectivo_esperado)}</td>
                    <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>{fmtM(cz.efectivo_real)}</td>
                    <td style={S.td}><span style={S.badge(cz.diferencia >= 0 ? 'rgba(46,232,122,0.1)' : 'rgba(255,71,87,0.12)', cz.diferencia >= 0 ? c.green : c.red, cz.diferencia >= 0 ? 'rgba(46,232,122,0.25)' : 'rgba(255,71,87,0.25)')}>{cz.diferencia >= 0 ? '+' : ''}{fmtM(cz.diferencia)}</span></td>
                    <td style={S.td}>{cz.cajero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder para Pro/Enterprise cats */}
      {['mesas', 'personal', 'compras', 'inventario', 'marketing', 'financiero'].includes(cat) && (
        <div style={{ textAlign: 'center', padding: 60, color: c.textDim }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dashboard en desarrollo</div>
          <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Disponible próximamente</div>
        </div>
      )}

      {/* ═══ MODAL CIERRE Z ═══ */}
      {showCierre && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div><div style={S.modalTitle}>🔒 Cierre de Caja (Corte Z)</div><div style={S.modalSub}>Cierre del período actual</div></div>
              <button onClick={() => setShowCierre(false)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              {/* Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ ...S.kpi, padding: 10 }}><div style={{ ...S.kpiLabel, fontSize: 8 }}>Total ventas</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: c.green }}>{fmtM(totalVentas)}</div></div>
                <div style={{ ...S.kpi, padding: 10 }}><div style={{ ...S.kpiLabel, fontSize: 8 }}>Transacciones</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900 }}>{totalTx}</div></div>
              </div>
              {/* Desglose */}
              {Object.entries(desglose).map(([method, data]) => {
                const met = METODOS.find(m => m.id === method)
                return (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.border}` }}>
                    <span style={{ fontSize: 12 }}>{met?.icon} {met?.label || method}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: c.green }}>{fmtM(data.total)}</span>
                  </div>
                )
              })}
              {/* Input efectivo real */}
              <div style={{ ...S.fgroup, marginTop: 16 }}>
                <label style={S.flabel}>EFECTIVO REAL EN CAJA ($)</label>
                <input type="number" step="0.01" min="0" value={cierreEfectivo} onChange={e => setCierreEfectivo(e.target.value)} style={{ ...S.finput, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", textAlign: 'center' }} placeholder="0.00" />
              </div>
              {cierreEfectivo && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: c.textDim }}>Diferencia: </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: ((parseFloat(cierreEfectivo) || 0) - (desglose['efectivo']?.total || 0)) >= 0 ? c.green : c.red }}>
                    {((parseFloat(cierreEfectivo) || 0) - (desglose['efectivo']?.total || 0)) >= 0 ? '+' : ''}{fmtM((parseFloat(cierreEfectivo) || 0) - (desglose['efectivo']?.total || 0))}
                  </span>
                </div>
              )}
            </div>
            <div style={S.modalFoot}>
              <button onClick={() => setShowCierre(false)} style={{ ...S.btn, ...S.btnGhost }}>Cancelar</button>
              <button onClick={ejecutarCierre} style={{ ...S.btn, ...S.btnPrimary }}>🔒 Ejecutar Cierre</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
