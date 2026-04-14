'use client'
import { useState, useEffect } from 'react'
import type { License } from '@/types'
import { useMenu } from '@/hooks/useMenu'
import { useSales } from '@/hooks/useSales'
import { supabase } from '@/lib/supabase.client'

interface OrderItem {
  id: string
  nombre: string
  precio: number
  qty: number
}

type PaymentMethod = 'efectivo' | 'tarjeta' | 'zelle' | 'otro'

export function POSLite({ license }: { license: License }) {
  const [order, setOrder] = useState<OrderItem[]>([])
  const [selectedPay, setSelectedPay] = useState<PaymentMethod>('efectivo')
  const [currentCat, setCurrentCat] = useState<string>('all')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successTotal, setSuccessTotal] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const { items, loading, categories } = useMenu(license.tenantId)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const filteredItems = currentCat === 'all' 
    ? items 
    : items.filter(i => (i.cat || 'Otros') === currentCat)

  const total = order.reduce((sum, item) => sum + item.precio * item.qty, 0)
  const itemCount = order.reduce((sum, item) => sum + item.qty, 0)

  const addToOrder = (item: typeof items[0]) => {
    setOrder(prev => {
      const existing = prev.find(o => o.id === item.id)
      if (existing) {
        return prev.map(o => o.id === item.id ? { ...o, qty: o.qty + 1 } : o)
      }
      return [...prev, { id: item.id, nombre: item.nombre, precio: item.precio, qty: 1 }]
    })
  }

  const changeQty = (id: string, delta: number) => {
    setOrder(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, qty: o.qty + delta } : o)
      return updated.filter(o => o.qty > 0)
    })
  }

  const processSale = async () => {
    if (!order.length || processing) return
    setProcessing(true)

    const saleId = 'S' + Date.now()
    const now = new Date().toISOString()

    try {
      await supabase.from('ventas').insert({
        id: saleId,
        tenant_id: license.tenantId,
        total,
        payment_method: selectedPay,
        created_at: now,
        tipo: 'venta',
        items: order.map(i => ({
          id: i.id,
          nombre: i.nombre,
          precio: i.precio,
          cantidad: i.qty,
          subtotal: i.precio * i.qty,
        })),
        cajero: license.tenantName,
      })

      setSuccessTotal(total)
      setShowSuccess(true)
      setOrder([])
    } catch (e) {
      console.error('Sale error:', e)
    } finally {
      setProcessing(false)
    }
  }

  const getPaymentLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, { es: string; icon: string }> = {
      efectivo: { es: 'Efectivo', icon: '💵' },
      tarjeta: { es: 'Tarjeta', icon: '💳' },
      zelle: { es: 'Zelle', icon: '📱' },
      otro: { es: 'Otro', icon: '📋' },
    }
    return labels[method]
  }

  const bg = theme === 'dark' ? '#0d0d0f' : '#f4f4f8'
  const surface = theme === 'dark' ? '#16161a' : '#fff'
  const surface2 = theme === 'dark' ? '#1e1e24' : '#f0f0f5'
  const border = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const text = theme === 'dark' ? '#f0f0f5' : '#111118'
  const textMid = theme === 'dark' ? '#b0b0c0' : '#444455'
  const textDim = theme === 'dark' ? '#606070' : '#888899'
  const orange = '#ff7c20'
  const green = '#2ee87a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: bg, color: text }}>
      {/* Topbar */}
      <div style={{
        height: 48, background: surface, borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>POS Lite</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              width: 34, height: 34, borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', color: textMid, cursor: 'pointer', fontSize: 14,
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Menu Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Categories */}
          <div style={{
            padding: '8px 12px', borderBottom: `1px solid ${border}`,
            display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0,
          }}>
            <button
              onClick={() => setCurrentCat('all')}
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${border}`,
                background: currentCat === 'all' ? orange : 'transparent',
                color: currentCat === 'all' ? '#fff' : textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Todos / All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCurrentCat(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${border}`,
                  background: currentCat === cat ? orange : 'transparent',
                  color: currentCat === cat ? '#fff' : textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{
            padding: 10, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8, overflowY: 'auto', flex: 1,
          }}>
            {loading && <div style={{ color: textDim, textAlign: 'center', gridColumn: '1/-1', padding: 40 }}>Cargando...</div>}
            {!loading && filteredItems.length === 0 && (
              <div style={{ color: textDim, textAlign: 'center', gridColumn: '1/-1', padding: 40 }}>
                Sin productos / No products
              </div>
            )}
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => addToOrder(item)}
                style={{
                  background: surface, border: `1px solid ${border}`, borderRadius: 10,
                  padding: 10, cursor: 'pointer', textAlign: 'center',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'}
                onMouseUp={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 8, background: surface2,
                  margin: '0 auto 6px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 32,
                }}>
                  {item.emoji || '🍽️'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, lineHeight: 1.2, height: 26, overflow: 'hidden' }}>
                  {item.nombre}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: orange, fontFamily: 'DM Mono, monospace' }}>
                  ${item.precio.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Panel */}
        <div style={{
          width: 280, background: surface, borderLeft: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Orden / Order</span>
            <span style={{ fontSize: 10, color: textDim, fontFamily: 'DM Mono, monospace' }}>{itemCount} items</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {order.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: textDim, fontSize: 11 }}>
                Tap items to add<br />Tap para agregar
              </div>
            )}
            {order.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: 8,
                background: surface2, border: `1px solid ${border}`, borderRadius: 8, marginBottom: 6,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: textDim, fontFamily: 'DM Mono, monospace' }}>
                    ${(item.precio * item.qty).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => changeQty(item.id, -1)}
                    style={{
                      width: 24, height: 24, borderRadius: 4, border: `1px solid ${border}`,
                      background: surface, color: text, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button
                    onClick={() => changeQty(item.id, 1)}
                    style={{
                      width: 24, height: 24, borderRadius: 4, border: `1px solid ${border}`,
                      background: surface, color: text, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 12px', borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: textDim }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>${total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              {(['efectivo', 'tarjeta', 'zelle', 'otro'] as PaymentMethod[]).map(method => {
                const { es, icon } = getPaymentLabel(method)
                return (
                  <button
                    key={method}
                    onClick={() => setSelectedPay(method)}
                    style={{
                      padding: '10px 8px', borderRadius: 8,
                      border: `1px solid ${selectedPay === method ? orange : border}`,
                      background: selectedPay === method ? orange : surface2,
                      color: selectedPay === method ? '#fff' : textMid,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {icon} {es}
                  </button>
                )
              })}
            </div>

            <button
              onClick={processSale}
              disabled={!order.length || processing}
              style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: order.length && !processing ? green : surface2,
                color: order.length && !processing ? '#000' : textDim,
                fontSize: 15, fontWeight: 700, cursor: order.length && !processing ? 'pointer' : 'not-allowed',
              }}
            >
              {processing ? 'Procesando...' : 'COBRAR'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 64, animation: 'popIn 0.3s ease' }}>✅</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: green }}>Venta Procesada</div>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
            ${successTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: textDim }}>
            {getPaymentLabel(selectedPay).icon} {getPaymentLabel(selectedPay).es}
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            style={{
              padding: '12px 32px', background: surface, border: `1px solid ${border}`,
              borderRadius: 8, color: text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Nueva Venta / New Sale
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
