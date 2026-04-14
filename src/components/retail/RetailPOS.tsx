'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { License } from '@/types'
import { supabase } from '@/lib/supabase.client'

interface Product {
  id: string
  sku: string
  nombre: string
  categoria: string
  precio: number
  precioBs: number
  stock: number
  tipo: 'unitario' | 'peso'
}

interface CartItem {
  id: string
  productId: string
  sku: string
  nombre: string
  categoria: string
  cantidad: number
  precio: number
  precioUnitario: number
  precioBs: number
  tipo: 'unitario' | 'peso'
}

interface ClientData {
  nombre: string
  telefono: string
  rif: string
  direccion: string
  observacion: string
}

interface PaymentMethod {
  id: string
  nombre: string
  icono: string
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: '💵' },
  { id: 'divisa', nombre: 'Divisa (USD)', icono: '💲' },
  { id: 'pz', nombre: 'Pago Móvil', icono: '📱' },
  { id: 'transfer', nombre: 'Transferencia', icono: '🏦' },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: '💳' },
  { id: 'credito', nombre: 'Crédito', icono: '📋' },
]

const IVA_RATE = 0.16

export function RetailPOS({ license }: { license: License }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [bcv, setBcv] = useState(419.99)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [client, setClient] = useState<ClientData>({
    nombre: '',
    telefono: '',
    rif: '',
    direccion: '',
    observacion: '',
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showProductGrid, setShowProductGrid] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [vuelto, setVuelto] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState({ date: '', time: '' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const updateDateTime = () => {
      const now = new Date()
      setCurrentDateTime({
        date: now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      })
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [theme])

  useEffect(() => {
    loadProducts()
  }, [license.tenantId])

  useEffect(() => {
    if (search.length >= 2) {
      const filtered = products.filter(p => 
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.nombre.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredProducts(filtered.slice(0, 8))
      setShowProductGrid(true)
    } else {
      setFilteredProducts([])
      setShowProductGrid(false)
    }
  }, [search, products])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
    const subtotalBs = cart.reduce((sum, item) => sum + (item.precioBs * item.cantidad), 0)
    const iva = subtotal * IVA_RATE
    const ivaBs = subtotalBs * IVA_RATE
    const total = subtotal + iva
    const totalBs = subtotalBs + ivaBs
    return { subtotal, subtotalBs, iva, ivaBs, total, totalBs }
  }, [cart])

  const calculatedVuelto = useMemo(() => {
    if (selectedPayment === 'efectivo' && montoRecibido) {
      const received = parseFloat(montoRecibido.replace(',', '.'))
      if (!isNaN(received)) {
        return Math.max(0, received - totals.total)
      }
    }
    return 0
  }, [montoRecibido, selectedPayment, totals.total])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('zytek_productos')
        .select('id, sku, nombre, categoria, precio, stock, tipo')
        .eq('tenant_id', license.tenantId)
        .eq('activo', true)
        .order('nombre')
        .limit(100)

      if (error) throw error

      const mapped: Product[] = (data || []).map(p => ({
        ...p,
        precioBs: Math.round(p.precio * bcv),
      }))
      setProducts(mapped)
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.productId === product.id)
    if (existing) {
      setCart(cart.map(c => 
        c.productId === product.id 
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ))
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        sku: product.sku,
        nombre: product.nombre,
        categoria: product.categoria,
        cantidad: 1,
        precio: product.precio,
        precioUnitario: product.precio,
        precioBs: product.precioBs,
        tipo: product.tipo,
      }
      setCart([...cart, newItem])
    }
    setSearch('')
    setShowProductGrid(false)
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.id !== itemId))
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === itemId) {
        const newQty = c.cantidad + delta
        return newQty > 0 ? { ...c, cantidad: newQty } : c
      }
      return c
    }).filter(c => c.cantidad > 0))
  }

  const clearSale = () => {
    setCart([])
    setClient({ nombre: '', telefono: '', rif: '', direccion: '', observacion: '' })
  }

  const processSale = async () => {
    if (cart.length === 0) return
    
    setLoading(true)
    try {
      const saleData = {
        tenant_id: license.tenantId,
        fecha: new Date().toISOString(),
        cliente: client.nombre || 'Consumidor Final',
        telefono: client.telefono,
        rif: client.rif,
        direccion: client.direccion,
        observacion: client.observacion,
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        total_bs: totals.totalBs,
        bcv: bcv,
        forma_pago: selectedPayment,
        monto_recibido: selectedPayment === 'efectivo' ? parseFloat(montoRecibido) : totals.total,
        vuelto: selectedPayment === 'efectivo' ? vuelto : 0,
        estatus: 'pagada',
        usuario: license.key,
      }

      const { data: sale, error: saleError } = await supabase
        .from('zytek_ventas')
        .insert(saleData)
        .select()
        .single()

      if (saleError) throw saleError

      for (const item of cart) {
        await supabase.from('zytek_ventas_detalle').insert({
          venta_id: sale.id,
          producto_id: item.productId,
          sku: item.sku,
          nombre: item.nombre,
          categoria: item.categoria,
          cantidad: item.cantidad,
          precio: item.precioUnitario,
          precio_bs: item.precioBs,
        })

        await supabase.rpc('decrementar_stock', {
          p_producto_id: item.productId,
          p_cantidad: item.cantidad,
        })
      }

      setShowPaymentModal(false)
      clearSale()
      await loadProducts()
    } catch (err) {
      console.error('Error processing sale:', err)
    } finally {
      setLoading(false)
    }
  }

  const colors = useMemo(() => ({
    bg: theme === 'dark' ? '#08101a' : '#e8eef5',
    surface: theme === 'dark' ? '#0d1829' : '#ffffff',
    surface2: theme === 'dark' ? '#0f1e30' : '#f4f7fb',
    surface3: theme === 'dark' ? '#162338' : '#eaf0f7',
    border: theme === 'dark' ? '#1e3048' : '#ccd8e8',
    border2: theme === 'dark' ? '#243a55' : '#b8cde0',
    text: theme === 'dark' ? '#e0eaf6' : '#0f2035',
    textMid: theme === 'dark' ? '#7a9ab8' : '#4a6a8a',
    textDim: theme === 'dark' ? '#4a6a8a' : '#8aaccb',
    topbar: theme === 'dark' ? '#071018' : '#1a3a5c',
    green: '#00e57a',
    cyan: '#00d4ff',
    blue: '#2a7de1',
    red: '#ff4455',
    amber: '#ffb800',
  }), [theme])

  const thStyle = {
    background: colors.surface2,
    color: colors.textDim,
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '8px 12px',
    borderBottom: `1px solid ${colors.border}`,
    borderRight: `1px solid ${colors.border}`,
    textAlign: 'left' as const,
    fontWeight: 500,
  }

  const styles = useMemo(() => ({
    topbar: {
      height: 56,
      background: colors.topbar,
      borderBottom: `2px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 0,
      position: 'relative' as const,
      zIndex: 100,
      flexShrink: 0,
    },
    brandZ: {
      width: 34,
      height: 34,
      borderRadius: 7,
      background: colors.blue,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Fraunces, serif',
      fontWeight: 700,
      fontSize: 18,
      color: '#fff',
    },
    searchWrap: {
      flex: 1,
      maxWidth: 600,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: colors.surface2,
      border: `1px solid ${colors.border2}`,
      borderRadius: 6,
      padding: '0 14px',
      height: 34,
    },
    searchInput: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      color: colors.text,
      fontFamily: "'DM Mono', monospace",
      fontSize: 12,
    },
    fkey: {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: 'linear-gradient(180deg, #1e4a8c 0%, #163a74 100%)',
      borderRight: '1px solid #0d2040',
    },
    fkeyRed: {
      background: 'linear-gradient(180deg, #d41428 0%, #aa0e20 100%)',
      borderColor: '#7a0a18',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      tableLayout: 'fixed' as const,
    },
  }), [colors])

  return (
    <div style={{ 
      height: '100vh', 
      background: colors.bg, 
      color: colors.text, 
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* TOPBAR */}
      <div style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16, borderRight: `1px solid ${colors.border}` }}>
          <div style={styles.brandZ}>Z</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>PUNTO DE VENTA</div>
            <div style={{ fontSize: 9, color: colors.textDim, fontFamily: "'DM Mono', monospace" }}>ZYTEK CLOUD ERP</div>
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <div style={styles.searchWrap}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: colors.textDim, letterSpacing: 2, textTransform: 'uppercase' }}>PRODUCTO</span>
            <input
              style={styles.searchInput}
              placeholder="ESCANEÉ O ESCRIBA NOMBRE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0) {
                  addToCart(filteredProducts[0])
                }
              }}
            />
            <span style={{ color: colors.textDim, fontSize: 14 }}>🔍</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderLeft: `1px solid ${colors.border}`, paddingLeft: 16 }}>
          <div style={{ textAlign: 'right', paddingRight: 14, borderRight: `1px solid ${colors.border}`, cursor: 'pointer' }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, color: colors.textDim, textTransform: 'uppercase' }}>TASA BCV</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                value={bcv}
                onChange={(e) => setBcv(parseFloat(e.target.value) || 0)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  fontFamily: "'DM Mono', monospace", 
                  fontSize: 14, 
                  color: colors.cyan, 
                  width: 90, 
                  textAlign: 'right',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: colors.textDim }}>Bs/$</span>
            </div>
            <div style={{ fontSize: 9, color: colors.textDim, fontFamily: "'DM Mono', monospace" }}>● manual</div>
          </div>
          
          <div style={{ paddingLeft: 14, textAlign: 'right' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: colors.textMid }}>{currentDateTime.date}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: colors.text, fontWeight: 500 }}>{currentDateTime.time}</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14, borderLeft: `1px solid ${colors.border}`, marginLeft: 14 }}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.amber,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
              }}
              title="Dark/Light"
            >
              ☀️
            </button>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${colors.border}`,
              background: colors.blue,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}>
              DZ
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT QUICK GRID */}
      {showProductGrid && filteredProducts.length > 0 && (
        <div style={{ 
          background: colors.surface2, 
          borderBottom: `1px solid ${colors.border}`, 
          maxHeight: 180, 
          overflowY: 'auto',
          position: 'relative',
          zIndex: 200,
        }}>
          <div style={{ 
            padding: '8px 12px', 
            fontSize: 9, 
            fontFamily: "'DM Mono', monospace", 
            letterSpacing: 2, 
            color: colors.textDim, 
            borderBottom: `1px solid ${colors.border}`,
          }}>
            PRODUCTOS — Click para agregar
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 8, 
            padding: 12,
          }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: 10,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{product.nombre}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: colors.textDim, marginTop: 2 }}>{product.sku}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: colors.green, marginTop: 2 }}>${product.precio.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* SALE TABLE */}
        <div style={{ flex: 1, overflowY: 'auto', background: colors.surface }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: colors.surface2 }}>
                <th style={{ ...thStyle, width: 90 }}>CÓDIGO</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' as const }}>CANT.</th>
                <th style={{ ...thStyle, width: 120 }}>CATEGORÍA</th>
                <th style={{ ...thStyle }}>DESCRIPCIÓN</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' as const }}>TP</th>
                <th style={{ ...thStyle, width: 110, textAlign: 'right' as const }}>PRECIO UNITARIO</th>
                <th style={{ ...thStyle, width: 110, textAlign: 'right' as const }}>PRECIO TOTAL</th>
                <th style={{ ...thStyle, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ 
                    textAlign: 'center', 
                    color: colors.textDim, 
                    padding: 40, 
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                  }}>
                    — SIN PRODUCTOS EN LA VENTA —
                  </td>
                </tr>
              ) : (
                cart.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: colors.cyan }}>{item.sku}</td>
                    <td style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.text,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.text,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace" }}>{item.categoria}</td>
                    <td style={{ color: colors.text }}>{item.nombre}</td>
                    <td style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>{item.tipo === 'peso' ? 'P' : 'U'}</td>
                    <td style={{ textAlign: 'right', color: colors.green, fontFamily: "'DM Mono', monospace" }}>${item.precioUnitario.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: colors.cyan, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          background: 'rgba(255,68,85,0.12)',
                          border: '1px solid rgba(255,68,85,0.3)',
                          color: colors.red,
                          cursor: 'pointer',
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PANEL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderTop: `2px solid ${colors.border}`, flexShrink: 0 }}>
          {/* CLIENT PANEL */}
          <div style={{ 
            background: colors.surface, 
            borderRight: `2px solid ${colors.border}`, 
            padding: '10px 14px', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '6px 12px',
          }}>
            <div style={{ gridColumn: '1 / -1', fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, paddingBottom: 4, borderBottom: `1px solid ${colors.border}` }}>
              DATOS DEL CLIENTE
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim }}>CLIENTE</span>
              <input
                type="text"
                placeholder="Nombre o razón social"
                value={client.nombre}
                onChange={(e) => setClient({ ...client, nombre: e.target.value })}
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  padding: '5px 8px',
                  color: colors.text,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim }}>TELÉFONOS</span>
              <input
                type="text"
                placeholder="+58 / +1 / +54"
                value={client.telefono}
                onChange={(e) => setClient({ ...client, telefono: e.target.value })}
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  padding: '5px 8px',
                  color: colors.text,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim }}>RIF / C.I.</span>
              <input
                type="text"
                placeholder="J-00000000-0"
                value={client.rif}
                onChange={(e) => setClient({ ...client, rif: e.target.value })}
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  padding: '5px 8px',
                  color: colors.text,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim }}>DIRECCIÓN</span>
              <input
                type="text"
                placeholder="Dirección completa"
                value={client.direccion}
                onChange={(e) => setClient({ ...client, direccion: e.target.value })}
                style={{
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  padding: '5px 8px',
                  color: colors.text,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* TOTALS PANEL */}
          <div style={{ background: colors.surface2, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: colors.textDim, letterSpacing: 1 }}>SUB-TOTAL</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: colors.text }}>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: colors.textDim, letterSpacing: 1 }}>I.V.A (16%)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: colors.text }}>${totals.iva.toFixed(2)}</span>
              </div>
            </div>
            
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: colors.textDim, textAlign: 'right', letterSpacing: 2, textTransform: 'uppercase' }}>MONTO TOTAL $</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, color: colors.cyan, lineHeight: 1, textAlign: 'right' }}>
                ${totals.total.toFixed(2)}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: colors.green, textAlign: 'right', marginTop: 2 }}>
                {(totals.total * bcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* F-KEYS */}
      <div style={{ borderTop: '2px solid #0d2040', flexShrink: 0, background: '#122040' }}>
        {/* Fila 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', height: 72 }}>
          <FKey num="F1" label="Fichas Clientes" icon="👤" onClick={() => {}} />
          <FKey num="F2" label="Formas de Pago" icon="💳" onClick={() => setShowPaymentModal(true)} />
          <FKey num="F3" label="Anular Venta" icon="🗑️" onClick={clearSale} />
          <FKey num="F4" label="Existencias" icon="📦" onClick={() => {}} />
          <FKey num="F5" label="Suspender" icon="⏸️" onClick={() => {}} />
          <FKey num="F6" label="Retomar" icon="▶️" onClick={() => {}} />
        </div>
        {/* Fila 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', height: 72 }}>
          <FKey num="F7" label="Opciones" icon="⚙️" onClick={() => {}} />
          <FKey num="F8" label="Anular Doc" icon="🚫" onClick={() => {}} />
          <FKey num="F10" label="Monto Total" icon="📄" onClick={() => {}} />
          <FKey num="F11" label="Revisión Caja" icon="📋" onClick={() => {}} />
          <FKey num="F12" label="Clausura Día" icon="🔒" onClick={() => {}} />
          <FKey num="ESC" label="Salir" icon="✕" isRed onClick={() => {}} />
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              width: '100%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700 }}>Formas de Pago</div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: colors.surface2,
                  border: `1px solid ${colors.border}`,
                  color: colors.textMid,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim, marginBottom: 8 }}>Seleccionar forma de pago</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setSelectedPayment(pm.id)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 8,
                        border: `1px solid ${selectedPayment === pm.id ? colors.cyan : colors.border}`,
                        background: selectedPayment === pm.id ? 'rgba(0,212,255,0.1)' : colors.surface2,
                        color: selectedPayment === pm.id ? colors.cyan : colors.text,
                        cursor: 'pointer',
                        fontSize: 11,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all .15s',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{pm.icono}</span>
                      <span>{pm.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPayment === 'efectivo' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim, marginBottom: 8 }}>Monto recibido</div>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      background: colors.surface2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      padding: '10px 12px',
                      color: colors.text,
                      fontSize: 16,
                      fontFamily: "'DM Mono', monospace",
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {selectedPayment === 'efectivo' && montoRecibido && (
                <div style={{ 
                  padding: 12, 
                  background: colors.surface2, 
                  borderRadius: 8, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: colors.textDim }}>Vuelto:</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: colors.green, fontFamily: "'DM Mono', monospace" }}>
                    ${vuelto.toFixed(2)}
                  </span>
                </div>
              )}

              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                background: colors.surface2, 
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim, marginBottom: 4 }}>Total a pagar</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.cyan }}>${totals.total.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textMid,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={processSale}
                disabled={loading || cart.length === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: colors.blue,
                  color: '#fff',
                  cursor: loading || cart.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: loading || cart.length === 0 ? 0.6 : 1,
                }}
              >
                {loading ? 'Procesando...' : 'Cobrar y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:wght@300;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  )
}

function FKey({ 
  num, 
  label, 
  icon, 
  onClick, 
  isRed = false 
}: { 
  num: string
  label: string
  icon: string
  onClick: () => void
  isRed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: isRed 
          ? 'linear-gradient(180deg, #d41428 0%, #aa0e20 100%)'
          : 'linear-gradient(180deg, #1e4a8c 0%, #163a74 100%)',
        borderRight: '1px solid #0d2040',
        height: '100%',
        border: 'none',
        color: '#fff',
      }}
    >
      <div style={{
        position: 'absolute',
        right: -8,
        top: '50%',
        transform: 'translateY(-48%)',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 900,
        fontSize: 68,
        lineHeight: 1,
        letterSpacing: -4,
        color: 'rgba(255,255,255,0.07)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {num.replace('F', '')}
      </div>
      <div style={{
        position: 'absolute',
        top: 5,
        left: 7,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 800,
        fontSize: isRed ? 16 : 13,
        lineHeight: 1,
        zIndex: 1,
        letterSpacing: .2,
      }}>
        {num}
      </div>
      <div style={{
        fontSize: 22,
        lineHeight: 1,
        zIndex: 1,
        position: 'relative',
        top: -2,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
      }}>
        {icon}
      </div>
      <div style={{
        position: 'absolute',
        bottom: 5,
        left: 0,
        right: 0,
        fontSize: 8,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        letterSpacing: .4,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.82)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '0 3px',
        zIndex: 1,
      }}>
        {label}
      </div>
    </button>
  )
}