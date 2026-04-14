'use client'
import { useState } from 'react'
import type { License, MenuItem } from '@/types'
import { useMenu } from '@/hooks/useMenu'
import { useSales, getSalesKPIs, getTopItems } from '@/hooks/useSales'
import { supabase } from '@/lib/supabase.client'

type Tab = 'sales' | 'top' | 'menu'
type DateRange = 'today' | 'week' | 'month' | 'custom'

export function AdminLite({ license }: { license: License }) {
  const [tab, setTab] = useState<Tab>('sales')
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const filters = { range: dateRange, desde: customDesde, hasta: customHasta }
  const { sales, loading: salesLoading, refetch: refetchSales } = useSales(license.tenantId, filters)
  const { items: menuItems, loading: menuLoading, refetch: refetchMenu, updateItem } = useMenu(license.tenantId)

  const kpis = getSalesKPIs(sales)
  const topItems = getTopItems(sales, 10)

  const bg = theme === 'dark' ? '#0d0d0f' : '#f4f4f8'
  const surface = theme === 'dark' ? '#16161a' : '#fff'
  const surface2 = theme === 'dark' ? '#1e1e24' : '#f0f0f5'
  const border = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const text = theme === 'dark' ? '#f0f0f5' : '#111118'
  const textMid = theme === 'dark' ? '#b0b0c0' : '#444455'
  const textDim = theme === 'dark' ? '#606070' : '#888899'
  const orange = '#ff7c20'
  const green = '#2ee87a'

  const handleToggleActivo = async (item: MenuItem) => {
    await updateItem(item.id, { activo: !item.activo })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    await updateItem(editingItem.id, {
      nombre: editingItem.nombre,
      precio: editingItem.precio,
    })
    setEditingItem(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, padding: 20, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>📊</span>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 900 }}>Admin Lite</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700 }}>
            {new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 10, color: textDim, fontFamily: 'DM Mono, monospace' }}>
            {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: textDim, marginBottom: 6 }}>
            Ventas Hoy / Today
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: green }}>
            ${kpis.hoy.toFixed(2)}
          </div>
        </div>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: textDim, marginBottom: 6 }}>
            Esta Semana / Week
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900 }}>
            ${kpis.semana.toFixed(2)}
          </div>
        </div>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: textDim, marginBottom: 6 }}>
            Este Mes / Month
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: orange }}>
            ${kpis.mes.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['today', 'week', 'month', 'custom'] as DateRange[]).map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${border}`,
              background: dateRange === range ? orange : 'transparent',
              color: dateRange === range ? '#fff' : textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Rango'}
          </button>
        ))}
        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={customDesde}
              onChange={e => setCustomDesde(e.target.value)}
              style={{
                background: surface2, border: `1px solid ${border}`, borderRadius: 8,
                padding: '6px 10px', color: text, fontSize: 11, fontFamily: 'DM Mono, monospace',
              }}
            />
            <input
              type="date"
              value={customHasta}
              onChange={e => setCustomHasta(e.target.value)}
              style={{
                background: surface2, border: `1px solid ${border}`, borderRadius: 8,
                padding: '6px 10px', color: text, fontSize: 11, fontFamily: 'DM Mono, monospace',
              }}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${border}`, marginBottom: 14 }}>
        {(['sales', 'top', 'menu'] as Tab[]).map(t => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? orange : textDim,
              borderBottom: `2px solid ${tab === t ? orange : 'transparent'}`,
            }}
          >
            {t === 'sales' ? '📋 Ventas' : t === 'top' ? '🏆 Top Items' : '🍽️ Menú'}
          </div>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Lista de Ventas / Sales List</div>
              <div style={{ fontSize: 10, color: textDim }}>{sales.length} venta{sales.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Hora</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Método</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Items</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {salesLoading && (
                  <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: textDim }}>Cargando...</td></tr>
                )}
                {!salesLoading && sales.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: textDim }}>Sin ventas / No sales</td></tr>
                )}
                {sales.slice(0, 100).map(sale => {
                  const time = new Date(sale.createdAt || sale.created_at || '').toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
                  const items = sale.items?.reduce((t, i) => t + (i.cantidad || 1), 0) || 0
                  const methodLabels: Record<string, string> = {
                    efectivo: '💵 Efectivo',
                    tarjeta: '💳 Tarjeta',
                    zelle: '📱 Zelle',
                    otro: '📋 Otro',
                  }
                  return (
                    <tr key={sale.id}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>{time}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 8px', borderRadius: 5, background: 'rgba(56,182,255,0.1)', color: '#38b6ff' }}>
                          {methodLabels[sale.formasPago?.[0]?.tipo || 'efectivo'] || sale.formasPago?.[0]?.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>{items} item{items !== 1 ? 's' : ''}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 700, color: green, fontFamily: 'DM Mono, monospace' }}>
                        ${(sale.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Items Tab */}
      {tab === 'top' && (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Más Vendidos / Top Sellers</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: 12 }}>
            {topItems.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: textDim, gridColumn: '1/-1' }}>Sin datos / No data</div>
            )}
            {topItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: surface2, border: `1px solid ${border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: orange, width: 24, textAlign: 'center' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: textDim, fontFamily: 'DM Mono, monospace' }}>{item.qty} sold</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: green, fontFamily: 'DM Mono, monospace' }}>${item.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Tab */}
      {tab === 'menu' && (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Gestionar Menú / Manage Menu</div>
            <div style={{ fontSize: 10, color: textDim }}>{menuItems.length} items</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Nombre</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Categoría</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Precio</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}>Activo</th>
                  <th style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: surface2, borderBottom: `1px solid ${border}` }}></th>
                </tr>
              </thead>
              <tbody>
                {menuLoading && (
                  <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: textDim }}>Cargando...</td></tr>
                )}
                {menuItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>{item.nombre}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 8px', borderRadius: 5, background: surface2, color: textDim }}>
                        {item.cat || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                      ${item.precio.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                      <div
                        onClick={() => handleToggleActivo(item)}
                        style={{
                          width: 32, height: 18, borderRadius: 9, background: item.activo !== false ? orange : surface2,
                          border: `1px solid ${item.activo !== false ? orange : border}`, cursor: 'pointer', position: 'relative',
                        }}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                          left: item.activo !== false ? 16 : 3, transition: 'left 0.2s',
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
                      <button
                        onClick={() => setEditingItem(item)}
                        style={{
                          padding: '4px 10px', background: 'transparent', border: `1px solid ${border}`,
                          borderRadius: 6, fontSize: 10, cursor: 'pointer', color: textMid,
                        }}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, width: '100%', maxWidth: 400 }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700 }}>Editar / Edit</span>
              <button
                onClick={() => setEditingItem(null)}
                style={{ width: 24, height: 24, borderRadius: 6, background: surface2, border: `1px solid ${border}`, color: textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: textDim, marginBottom: 4, display: 'block' }}>
                  NOMBRE / NAME
                </label>
                <input
                  type="text"
                  value={editingItem.nombre}
                  onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })}
                  style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 6, padding: '8px 10px', color: text, fontSize: 12, width: '100%', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: textDim, marginBottom: 4, display: 'block' }}>
                  PRECIO / PRICE ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.precio}
                  onChange={e => setEditingItem({ ...editingItem, precio: parseFloat(e.target.value) || 0 })}
                  style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 6, padding: '8px 10px', color: text, fontSize: 12, width: '100%', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingItem(null)}
                style={{ padding: '8px 16px', borderRadius: 7, background: 'transparent', color: textMid, border: `1px solid ${border}`, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ padding: '8px 16px', borderRadius: 7, background: orange, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Guardar / Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Button */}
      <button
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        style={{
          position: 'fixed', bottom: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
          border: `1px solid ${border}`, background: surface, color: '#ffc040', cursor: 'pointer',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
