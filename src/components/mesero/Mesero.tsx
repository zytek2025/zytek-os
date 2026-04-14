'use client'
import { useState, useEffect, useCallback } from 'react'
import type { License, MenuItem, VentaItem } from '@/types'
import { useMenu } from '@/hooks/useMenu'
import { supabase } from '@/lib/supabase.client'

type TableStatus = 'libre' | 'ocupada' | 'cuenta' | 'reservada' | 'deuda'

interface Mesa {
  id: string
  zona: string
  cap: number
  estado: TableStatus
  personas: number
  minutos: number
  monto: number
  mesero: string | null
}

interface OrderItem {
  id: string
  itemId: string
  nombre: string
  emoji: string
  precio: number
  cantidad: number
  modificadores: string[]
  nota: string
  subtotal: number
  enviado: boolean
}

interface Categoria {
  id: string
  name: string
  emoji: string
}

const AMBIENTES = [
  { id: 'salon', name: 'Salón', emoji: '🏛️' },
  { id: 'vip', name: 'VIP', emoji: '⭐' },
  { id: 'terraza', name: 'Terraza', emoji: '🌿' },
  { id: 'privado', name: 'Privado', emoji: '🔒' },
  { id: 'barra', name: 'Barra', emoji: '🍺' },
]

const ESTADO_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  libre: { bg: 'rgba(46,232,122,0.1)', border: 'rgba(46,232,122,0.25)', text: '#2ee87a' },
  ocupada: { bg: 'rgba(56,182,255,0.1)', border: 'rgba(56,182,255,0.25)', text: '#38b6ff' },
  cuenta: { bg: 'rgba(255,124,32,0.12)', border: 'rgba(255,124,32,0.3)', text: '#ff7c20' },
  reservada: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.25)', text: '#a855f7' },
  deuda: { bg: 'rgba(255,71,87,0.12)', border: 'rgba(255,71,87,0.25)', text: '#ff4757' },
}

export function Mesero({ license }: { license: License }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [activeView, setActiveView] = useState<'mesas' | 'comanda'>('mesas')
  const [selectedAmbiente, setSelectedAmbiente] = useState('salon')
  const [tables, setTables] = useState<Mesa[]>([])
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null)
  const [currentStep, setCurrentStep] = useState<'cats' | 'prods' | 'qty' | 'mods'>('cats')
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)
  const [qty, setQty] = useState(1)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedMods, setSelectedMods] = useState<string[]>([])
  const [nota, setNota] = useState('')
  const [sendingOrder, setSendingOrder] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const { items, loading, categories } = useMenu(license.tenantId)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const loadTables = useCallback(async () => {
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .eq('zona', selectedAmbiente)
      .order('numero')

    if (data) {
      setTables(data.map(m => ({
        id: m.numero,
        zona: m.zona,
        cap: m.capacidad,
        estado: (m.estado as TableStatus) || 'libre',
        personas: m.personas || 0,
        minutos: 0,
        monto: m.monto || 0,
        mesero: m.mesero,
      })))
    }
  }, [license.tenantId, selectedAmbiente])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  const filteredItems = selectedCategory
    ? items.filter(i => (i.cat || 'Otros') === selectedCategory.id)
    : []

  const tableCount = tables.length
  const occupiedCount = tables.filter(t => t.estado !== 'libre').length

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0)

  const addItem = () => {
    if (!selectedProduct) return

    const newItem: OrderItem = {
      id: Date.now().toString(),
      itemId: selectedProduct.id,
      nombre: selectedProduct.nombre,
      emoji: selectedProduct.emoji || '🍽️',
      precio: selectedProduct.precio,
      cantidad: qty,
      modificadores: selectedMods,
      nota,
      subtotal: selectedProduct.precio * qty,
      enviado: false,
    }

    setOrderItems(prev => [...prev, newItem])
    resetProductSelection()
  }

  const resetProductSelection = () => {
    setSelectedProduct(null)
    setQty(1)
    setSelectedMods([])
    setNota('')
    setCurrentStep('cats')
  }

  const removeItem = (id: string) => {
    setOrderItems(prev => prev.filter(i => i.id !== id))
  }

  const changeQtyItem = (id: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.cantidad + delta
        if (newQty <= 0) return null
        return { ...item, cantidad: newQty, subtotal: item.precio * newQty }
      }
      return item
    }).filter(Boolean) as OrderItem[])
  }

  const sendToKitchen = async () => {
    if (!selectedMesa || !orderItems.length || sendingOrder) return
    setSendingOrder(true)

    try {
      const pedidoId = 'P' + Date.now()

      await supabase.from('pedidos').insert({
        id: pedidoId,
        tenant_id: license.tenantId,
        mesa_id: selectedMesa.id,
        mesa_numero: selectedMesa.id,
        estado: 'pendiente',
        items: orderItems.map(item => ({
          item_id: item.itemId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          modificadores: item.modificadores,
          nota: item.nota,
        })),
        total,
        created_at: new Date().toISOString(),
      })

      setOrderItems(prev => prev.map(i => ({ ...i, enviado: true })))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (e) {
      console.error('Send to kitchen error:', e)
    } finally {
      setSendingOrder(false)
    }
  }

  const selectMesa = (mesa: Mesa) => {
    setSelectedMesa(mesa)
    setActiveView('comanda')
  }

  const getStatusLabel = (estado: TableStatus) => {
    const labels: Record<TableStatus, string> = {
      libre: 'LIBRE',
      ocupada: 'OCUPADA',
      cuenta: 'CUENTA',
      reservada: 'RESERVADA',
      deuda: 'CRÉDITO',
    }
    return labels[estado]
  }

  const formatMoney = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const colors = {
    bg: theme === 'dark' ? '#0d0d0f' : '#f4f4f8',
    surface: theme === 'dark' ? '#16161a' : '#fff',
    surface2: theme === 'dark' ? '#1e1e24' : '#f0f0f5',
    border: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    text: theme === 'dark' ? '#f0f0f5' : '#111118',
    textDim: theme === 'dark' ? '#606070' : '#888899',
    textMid: theme === 'dark' ? '#b0b0c0' : '#444455',
    orange: '#ff7c20',
    green: '#2ee87a',
    blue: '#38b6ff',
    red: '#ff4757',
    amber: '#ffc040',
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
      color: colors.text,
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Topbar */}
      <div style={{
        height: 52,
        background: theme === 'dark' ? '#111114' : '#fff',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: colors.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🍽️</div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 900 }}>
              POS MESERO
            </div>
            <div style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", letterSpacing: 2, color: colors.textDim }}>
              ZYTEK CLOUD ERP
            </div>
          </div>
        </div>
        <div style={{
          padding: '3px 10px', borderRadius: 20, background: colors.surface2,
          border: `1px solid ${colors.border}`, fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: colors.green,
        }}>
          ● {occupiedCount}/{tableCount} mesas
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`,
              background: 'transparent', color: colors.amber, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{
        height: 36,
        background: theme === 'dark' ? '#111114' : '#fff',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 8px',
        gap: 2,
        flexShrink: 0,
      }}>
        <div
          onClick={() => setActiveView('mesas')}
          style={{
            padding: '6px 14px',
            borderRadius: '5px 5px 0 0',
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            cursor: 'pointer',
            color: activeView === 'mesas' ? colors.orange : colors.textDim,
            background: activeView === 'mesas' ? colors.surface2 : 'transparent',
            border: activeView === 'mesas' ? `1px solid ${colors.border}` : '1px solid transparent',
            borderBottom: activeView === 'mesas' ? `1px solid ${colors.surface2}` : 'none',
          }}
        >
          🗺️ MESAS
        </div>
        <div
          onClick={() => setActiveView('comanda')}
          style={{
            padding: '6px 14px',
            borderRadius: '5px 5px 0 0',
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            cursor: 'pointer',
            color: activeView === 'comanda' ? colors.orange : colors.textDim,
            background: activeView === 'comanda' ? colors.surface2 : 'transparent',
            border: activeView === 'comanda' ? `1px solid ${colors.border}` : '1px solid transparent',
            borderBottom: activeView === 'comanda' ? `1px solid ${colors.surface2}` : 'none',
          }}
        >
          📋 COMANDA
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        
        {/* VIEW: MESAS */}
        {activeView === 'mesas' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {/* Ambientes Column */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}>
              <div style={{
                background: theme === 'dark' ? '#111114' : '#fff',
                borderRight: `2px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div style={{
                  fontSize: 7,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: colors.textDim,
                  padding: '6px 4px 4px',
                  textAlign: 'center',
                }}>
                  ZONAS
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                  {AMBIENTES.map(amb => (
                    <div
                      key={amb.id}
                      onClick={() => setSelectedAmbiente(amb.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        padding: '8px 4px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        marginBottom: 4,
                        background: selectedAmbiente === amb.id ? 'rgba(46,232,122,0.1)' : 'transparent',
                        border: selectedAmbiente === amb.id ? '1px solid rgba(46,232,122,0.25)' : '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 20 }}>{amb.emoji}</div>
                      <div style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: selectedAmbiente === amb.id ? colors.green : colors.text,
                      }}>
                        {amb.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mesa Grid */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: colors.bg,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderBottom: `1px solid ${colors.border}`,
                  background: colors.surface,
                }}>
                  <div style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 14,
                    fontWeight: 700,
                  }}>
                    {AMBIENTES.find(a => a.id === selectedAmbiente)?.emoji}{' '}
                    {AMBIENTES.find(a => a.id === selectedAmbiente)?.name}
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: 16,
                        fontWeight: 900,
                      }}>
                        {occupiedCount}
                      </span>
                      <span style={{
                        fontSize: 8,
                        fontFamily: "'DM Mono', monospace",
                        color: colors.textDim,
                        letterSpacing: 1,
                      }}>
                        activas
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 6,
                  padding: 8,
                  overflowY: 'auto',
                  alignContent: 'start',
                }}>
                  {tables.map(mesa => {
                    const statusColors = ESTADO_COLORS[mesa.estado]
                    return (
                      <div
                        key={mesa.id}
                        onClick={() => selectMesa(mesa)}
                        style={{
                          borderRadius: 8,
                          padding: '6px 4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          border: `2px solid ${statusColors.border}`,
                          background: statusColors.bg,
                          color: statusColors.text,
                          width: '100%',
                          height: 78,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}>
                          {mesa.id}
                        </div>
                        <div style={{
                          fontSize: 7,
                          fontFamily: "'DM Mono', monospace",
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          marginTop: 2,
                        }}>
                          {getStatusLabel(mesa.estado)}
                        </div>
                        {mesa.estado !== 'libre' && (
                          <>
                            <div style={{ fontSize: 8, color: colors.textDim, marginTop: 2 }}>
                              {mesa.mesero}
                            </div>
                            {mesa.monto > 0 && (
                              <div style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 10,
                                fontWeight: 700,
                                marginTop: 2,
                              }}>
                                ${mesa.monto.toFixed(0)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: COMANDA */}
        {activeView === 'comanda' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Header - Mesa Selector */}
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${colors.border}`,
              background: colors.surface,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: colors.textDim, fontFamily: "'DM Mono', monospace" }}>
                  MESA:
                </span>
                <select
                  value={selectedMesa?.id || ''}
                  onChange={e => {
                    const mesa = tables.find(m => m.id === e.target.value)
                    if (mesa) setSelectedMesa(mesa)
                  }}
                  style={{
                    background: colors.surface2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 6,
                    padding: '7px 10px',
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                    flex: 1,
                  }}
                >
                  <option value="">— seleccionar —</option>
                  {tables.filter(t => t.estado !== 'libre').map(mesa => (
                    <option key={mesa.id} value={mesa.id}>
                      {mesa.id} — {mesa.mesero || 'Sin mesero'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breadcrumb */}
            {currentStep !== 'cats' && (
              <div style={{
                padding: '6px 14px',
                background: colors.surface2,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
                color: colors.textDim,
                flexShrink: 0,
              }}>
                <span
                  onClick={() => setCurrentStep('cats')}
                  style={{ cursor: 'pointer', color: colors.orange }}
                >
                  {selectedCategory?.name}
                </span>
                {currentStep !== 'prods' && (
                  <>
                    <span>›</span>
                    <span
                      onClick={() => currentStep !== 'qty' && setCurrentStep('prods')}
                      style={{ cursor: 'pointer', color: colors.textMid }}
                    >
                      {selectedProduct?.nombre}
                    </span>
                  </>
                )}
                {currentStep === 'qty' && (
                  <>
                    <span>›</span>
                    <span style={{ color: colors.text }}>Cantidad</span>
                  </>
                )}
                {currentStep === 'mods' && (
                  <>
                    <span>›</span>
                    <span style={{ color: colors.text }}>Extras</span>
                  </>
                )}
              </div>
            )}

            {/* Step: Categories */}
            {currentStep === 'cats' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: colors.textDim,
                  padding: '8px 14px',
                  borderBottom: `1px solid ${colors.border}`,
                }}>
                  CATEGORÍAS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  padding: 10,
                  overflowY: 'auto',
                  flex: 1,
                  alignContent: 'start',
                }}>
                  {categories.map(cat => {
                    const catData = CATEGORIAS.find(c => c.id === cat)
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategory({ id: cat, name: catData?.name || cat, emoji: catData?.emoji || '🍽️' })
                          setCurrentStep('prods')
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4,
                          padding: 10,
                          borderRadius: 12,
                          cursor: 'pointer',
                          background: colors.surface2,
                          border: `2px solid ${colors.border}`,
                          transition: 'all 0.13s',
                          height: 90,
                        }}
                      >
                        <div style={{ fontSize: 26, lineHeight: 1 }}>{catData?.emoji || '🍽️'}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>{catData?.name || cat}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step: Products */}
            {currentStep === 'prods' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: colors.textDim,
                  padding: '8px 14px',
                  borderBottom: `1px solid ${colors.border}`,
                }}>
                  PRODUCTOS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  padding: 10,
                  overflowY: 'auto',
                  flex: 1,
                  alignContent: 'start',
                }}>
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedProduct(item)
                        setQty(1)
                        setCurrentStep('qty')
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                        padding: 10,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: colors.surface2,
                        border: `2px solid ${colors.border}`,
                        transition: 'all 0.13s',
                        height: 90,
                      }}
                    >
                      <div style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji || '🍽️'}</div>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.text,
                        textAlign: 'center',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        maxWidth: '100%',
                      }}>
                        {item.nombre}
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                        color: colors.orange,
                        fontWeight: 700,
                      }}>
                        ${item.precio.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 14px',
                  borderTop: `1px solid ${colors.border}`,
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => setCurrentStep('cats')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 7,
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textMid,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ← Atrás
                  </button>
                </div>
              </div>
            )}

            {/* Step: Quantity */}
            {currentStep === 'qty' && selectedProduct && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: colors.textDim,
                  padding: '8px 14px',
                  borderBottom: `1px solid ${colors.border}`,
                }}>
                  CANTIDAD
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: 20,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}>
                      {selectedProduct.emoji || '🍽️'}
                    </div>
                    <div style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 16,
                      fontWeight: 700,
                    }}>
                      {selectedProduct.nombre}
                    </div>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      color: colors.orange,
                      marginTop: 2,
                    }}>
                      ${selectedProduct.precio.toFixed(2)} c/u
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        border: `2px solid ${colors.border}`,
                        background: colors.surface2,
                        color: colors.text,
                        fontSize: 28,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                    <div style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 52,
                      fontWeight: 900,
                      color: colors.orange,
                      minWidth: 70,
                      textAlign: 'center',
                      lineHeight: 1,
                    }}>
                      {qty}
                    </div>
                    <button
                      onClick={() => setQty(q => q + 1)}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        border: `2px solid ${colors.border}`,
                        background: colors.surface2,
                        color: colors.text,
                        fontSize: 28,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, width: '100%', maxWidth: 280 }}>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map(n => (
                      <button
                        key={n}
                        onClick={() => setQty(n)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: 8,
                          border: `2px solid ${colors.border}`,
                          background: colors.surface2,
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'DM Mono', monospace",
                          cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 14px',
                  borderTop: `1px solid ${colors.border}`,
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => setCurrentStep('prods')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 7,
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textMid,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={() => {
                      addItem()
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 7,
                      border: 'none',
                      background: colors.orange,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    ✅ Agregar ({qty})
                  </button>
                </div>
              </div>
            )}

            {/* Action Keys Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              flexShrink: 0,
              borderTop: `2px solid ${colors.border}`,
              background: '#0f1923',
            }}>
              <div
                onClick={() => {}}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  height: 52,
                  background: 'linear-gradient(180deg,#1e4a8c 0%,#163a74 100%)',
                }}
              >
                <div style={{ fontSize: 17 }}>👤</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  Cliente
                </div>
              </div>
              <div
                onClick={() => {}}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  height: 52,
                  background: 'linear-gradient(180deg,#cc5500 0%,#aa4000 100%)',
                }}
              >
                <div style={{ fontSize: 17 }}>💳</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  Cobrar
                </div>
              </div>
              <div
                onClick={() => sendToKitchen()}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: orderItems.length ? 'pointer' : 'not-allowed',
                  height: 52,
                  background: orderItems.length
                    ? 'linear-gradient(180deg,#1a6e3a 0%,#115a2a 100%)'
                    : 'linear-gradient(180deg,#1a3a2a 0%,#0f2a1a 100%)',
                  opacity: orderItems.length ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 17 }}>👨‍🍳</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  Cocina
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Panel (Bottom Sheet on Mobile) */}
      {activeView === 'comanda' && orderItems.length > 0 && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          background: colors.surface2,
          maxHeight: '40dvh',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 16,
                fontWeight: 700,
              }}>
                {selectedMesa ? `Mesa ${selectedMesa.id}` : 'Sin mesa'}
              </div>
              <div style={{ fontSize: 10, color: colors.textDim }}>
                {orderItems.length} items
              </div>
            </div>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 20,
              fontWeight: 900,
              color: colors.orange,
            }}>
              ${total.toFixed(2)}
            </div>
          </div>
          <div style={{ padding: 8 }}>
            {orderItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  padding: 8,
                  borderRadius: 8,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  marginBottom: 5,
                  opacity: item.enviado ? 0.65 : 1,
                }}
              >
                <div style={{ fontSize: 18 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.nombre}
                  </div>
                  {item.modificadores.length > 0 && (
                    <div style={{
                      fontSize: 9,
                      color: colors.textDim,
                      fontFamily: "'DM Mono', monospace",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>
                      {item.modificadores.join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <button
                      onClick={() => changeQtyItem(item.id, -1)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: `1px solid ${colors.border}`,
                        background: colors.surface2,
                        color: colors.text,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      −
                    </button>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 16,
                      textAlign: 'center',
                    }}>
                      {item.cantidad}
                    </div>
                    <button
                      onClick={() => changeQtyItem(item.id, 1)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: `1px solid ${colors.border}`,
                        background: colors.surface2,
                        color: colors.text,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: colors.orange, fontWeight: 700 }}>
                  ${item.subtotal.toFixed(2)}
                </div>
                {item.enviado && (
                  <div style={{
                    fontSize: 8,
                    fontFamily: "'DM Mono', monospace",
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'rgba(46,232,122,0.1)',
                    color: colors.green,
                    border: '1px solid rgba(46,232,122,0.25)',
                  }}>
                    ENV
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.green }}>
            Pedido Enviado a Cocina
          </div>
          <div style={{ fontSize: 14, color: colors.textDim }}>
            {selectedMesa && `Mesa ${selectedMesa.id}`}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

const CATEGORIAS: Categoria[] = [
  { id: 'entradas', name: 'Entradas', emoji: '🥗' },
  { id: 'pizzas', name: 'Pizzas', emoji: '🍕' },
  { id: 'pastas', name: 'Pastas', emoji: '🍝' },
  { id: 'carnes', name: 'Carnes', emoji: '🥩' },
  { id: 'aves', name: 'Aves', emoji: '🍗' },
  { id: 'mariscos', name: 'Mariscos', emoji: '🦐' },
  { id: 'hamburguesas', name: 'Hamburguesas', emoji: '🍔' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤' },
  { id: 'postres', name: 'Postres', emoji: '🍰' },
]