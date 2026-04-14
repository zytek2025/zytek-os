'use client'
import { useState, useEffect, useCallback } from 'react'
import type { License, Cliente, CxC, Venta } from '@/types'
import { supabase } from '@/lib/supabase.client'

type View = 'directorio' | 'cxc' | 'fidelizacion' | 'historial' | 'config'

interface ClienteConStats extends Cliente {
  visitas: number
  gasto: number
  cxc: number
  puntos: number
  nivel: string
  ultima: string
}

const NIVELES = [
  { nombre: 'Bronce', min: 0, max: 499, color: '#606070' },
  { nombre: 'Plata', min: 500, max: 999, color: '#4a90d9' },
  { nombre: 'Oro', min: 1000, max: 2499, color: '#ffb020' },
  { nombre: 'VIP', min: 2500, max: Infinity, color: '#a855f7' },
]

export function CRMPanel({ license }: { license: License }) {
  const [view, setView] = useState<View>('directorio')
  const [clientes, setClientes] = useState<ClienteConStats[]>([])
  const [cxc, setCxC] = useState<CxC[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<ClienteConStats | null>(null)
  const [showModal, setShowModal] = useState<'cliente' | null>(null)
  const [formData, setFormData] = useState({ nombre: '', tel: '', email: '', tipo: 'regular' })
  const [dataSource, setDataSource] = useState<string>('demo')

  const theme = { bg: '#0d0d0f', surface: '#16161a', surface2: '#1e1e24', border: 'rgba(255,255,255,0.08)', text: '#f0f0f5', textMid: '#b0b0c0', textDim: '#606070', orange: '#ff7c20', green: '#2ee87a', amber: '#ffb020', red: '#ef4444', blue: '#4a90d9', purple: '#a855f7' }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', license.tenantId)
        .order('nombre')

      if (clientesData && clientesData.length > 0) {
        setClientes(clientesData as ClienteConStats[])
        setDataSource('supabase')
      } else {
        const demo: ClienteConStats[] = [
          { id: 'c001', nombre: 'Rafael Torres', tel: '0414-1234567', email: 'rafael@mail.com', visitas: 14, gasto: 428, cxc: 45, puntos: 280, nivel: 'Oro', tipo: 'frecuente', estado: 'Activo', ultima: 'hoy', tenantId: license.tenantId, adelanto: 0 },
          { id: 'c002', nombre: 'Carmen Diaz', tel: '0416-2345678', email: 'carmen@mail.com', visitas: 11, gasto: 310.5, cxc: 0, puntos: 185, nivel: 'Plata', tipo: 'frecuente', estado: 'Activo', ultima: 'ayer', tenantId: license.tenantId, adelanto: 0 },
          { id: 'c003', nombre: 'Jose Martin', tel: '0412-3456789', email: 'jose@mail.com', visitas: 9, gasto: 298, cxc: 67, puntos: 150, nivel: 'Plata', tipo: 'credito', estado: 'Activo', ultima: 'hace 2 dias', tenantId: license.tenantId, adelanto: 0 },
          { id: 'c004', nombre: 'Ana Rodriguez', tel: '0424-4567890', email: 'ana@mail.com', visitas: 7, gasto: 189, cxc: 0, puntos: 95, nivel: 'Bronce', tipo: 'frecuente', estado: 'Activo', ultima: 'hace 4 dias', tenantId: license.tenantId, adelanto: 0 },
          { id: 'c005', nombre: 'Luis Vargas', tel: '0426-5678901', email: 'luis@mail.com', visitas: 6, gasto: 175.5, cxc: 28.5, puntos: 88, nivel: 'Bronce', tipo: 'credito', estado: 'Activo', ultima: 'esta semana', tenantId: license.tenantId, adelanto: 0 },
        ]
        setClientes(demo)
        setDataSource('demo')
      }

      const { data: cxcData } = await supabase.from('cuentas_por_cobrar').select('*').eq('tenant_id', license.tenantId)
      setCxC(cxcData || [])

      const { data: ventasData } = await supabase.from('ventas').select('*').eq('tenant_id', license.tenantId).order('created_at', { ascending: false }).limit(100)
      setVentas(ventasData as Venta[] || [])
    } catch (e) {
      const demo: ClienteConStats[] = [
        { id: 'c001', nombre: 'Rafael Torres', tel: '0414-1234567', email: 'rafael@mail.com', visitas: 14, gasto: 428, cxc: 45, puntos: 280, nivel: 'Oro', tipo: 'frecuente', estado: 'Activo', ultima: 'hoy', tenantId: license.tenantId, adelanto: 0 },
        { id: 'c002', nombre: 'Carmen Diaz', tel: '0416-2345678', email: 'carmen@mail.com', visitas: 11, gasto: 310, cxc: 0, puntos: 185, nivel: 'Plata', tipo: 'frecuente', estado: 'Activo', ultima: 'ayer', tenantId: license.tenantId, adelanto: 0 },
        { id: 'c003', nombre: 'Jose Martin', tel: '0412-3456789', email: 'jose@mail.com', visitas: 9, gasto: 298, cxc: 67, puntos: 150, nivel: 'Plata', tipo: 'credito', estado: 'Activo', ultima: 'hace 2 dias', tenantId: license.tenantId, adelanto: 0 },
      ]
      setClientes(demo)
      setDataSource('demo')
    } finally {
      setLoading(false)
    }
  }, [license.tenantId])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredClientes = clientes.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.tel?.includes(search)
  )

  const totalGasto = filteredClientes.reduce((s, c) => s + (c.gasto || 0), 0)
  const totalCxC = filteredClientes.reduce((s, c) => s + (c.cxc || 0), 0)
  const ticketProm = filteredClientes.length ? totalGasto / filteredClientes.length : 0

  const crearCliente = async () => {
    if (!formData.nombre.trim()) return
    const id = 'CLI' + Date.now()
    const nuevo: ClienteConStats = {
      ...formData, id, visitas: 0, gasto: 0, cxc: 0, puntos: 0, nivel: 'Bronce',
      estado: 'Activo', ultima: 'hoy', tenantId: license.tenantId, adelanto: 0
    }
    await supabase.from('clientes').insert({ ...nuevo, tenant_id: license.tenantId })
    setClientes([nuevo, ...clientes])
    setShowModal(null)
    setFormData({ nombre: '', tel: '', email: '', tipo: 'regular' })
  }

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Oro': return theme.amber
      case 'Plata': return theme.blue
      case 'VIP': return theme.purple
      default: return theme.green
    }
  }

  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`

  const renderDirectorio = () => (
    <div>
      {dataSource !== 'demo' && (
        <div style={{ background: 'rgba(46,232,122,0.1)', border: '1px solid rgba(46,232,122,0.3)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 11, color: theme.green }}>
          Datos importados de {dataSource === 'supabase' ? 'Supabase' : 'POS'} - {clientes.length} clientes disponibles
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>CLIENTES</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.text }}>{filteredClientes.length}</div>
        </div>
        <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>GASTO TOTAL</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.green }}>{formatMoney(totalGasto)}</div>
        </div>
        <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>CxC ACTIVA</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.amber }}>{formatMoney(totalCxC)}</div>
        </div>
        <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>TICKET PROM.</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.text }}>{formatMoney(ticketProm)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          placeholder="Buscar por nombre o telefono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: theme.surface2, border: '1px solid ' + theme.border, borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 12, outline: 'none' }}
        />
        <button onClick={() => setShowModal('cliente')} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: theme.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Nuevo</button>
      </div>

      <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>NOMBRE</th>
              <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>TELEFONO</th>
              <th style={{ textAlign: 'center', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>VISITAS</th>
              <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>GASTO</th>
              <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>CxC</th>
              <th style={{ textAlign: 'center', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>NIVEL</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map(c => (
              <tr key={c.id} onClick={() => setSelectedCliente(c)} style={{ cursor: 'pointer' }}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border }}><strong style={{ color: theme.text }}>{c.nombre}</strong></td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, fontFamily: 'DM Mono, monospace' }}>{c.tel || '-'}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'center' }}>{c.visitas || 0}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: theme.green }}>{formatMoney(c.gasto || 0)}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: c.cxc > 0 ? theme.amber : theme.textDim }}>{c.cxc > 0 ? formatMoney(c.cxc) : '-'}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, background: getNivelColor(c.nivel) + '20', color: getNivelColor(c.nivel), border: '1px solid ' + getNivelColor(c.nivel) }}>
                    {c.nivel || 'Bronce'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderCxC = () => {
    const activas = cxc.filter(c => (c.saldo || 0) > 0)
    const totalSaldo = activas.reduce((s, c) => s + (c.saldo || 0), 0)
    const vencidas = activas.filter(c => c.estado === 'vencida')

    return (
      <div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>CxC ACTIVAS</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.text }}>{activas.length}</div>
          </div>
          <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>SALDO TOTAL</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.amber }}>{formatMoney(totalSaldo)}</div>
          </div>
          <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>VENCIDAS</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.red }}>{vencidas.length}</div>
          </div>
        </div>

        <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>CLIENTE</th>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>CONCEPTO</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>TOTAL</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>SALDO</th>
                <th style={{ textAlign: 'center', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {activas.map(c => {
                const cli = clientes.find(x => x.id === c.clienteId)
                return (
                  <tr key={c.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, fontWeight: 600, color: theme.text }}>{cli?.nombre || c.cliente || '-'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border }}>{c.concepto}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{formatMoney(c.total || 0)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: theme.amber, fontWeight: 700 }}>{formatMoney(c.saldo || 0)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, background: c.estado === 'vencida' ? 'rgba(239,68,68,0.1)' : 'rgba(255,176,32,0.1)', color: c.estado === 'vencida' ? theme.red : theme.amber, border: '1px solid ' + (c.estado === 'vencida' ? theme.red : theme.amber) }}>
                        {c.estado || 'activa'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFidelizacion = () => {
    const totalPuntos = clientes.reduce((s, c) => s + (c.puntos || 0), 0)

    return (
      <div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>TOTAL PUNTOS</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.text }}>{totalPuntos.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 10, overflow: 'hidden' }}>
          {NIVELES.map(n => {
            const miembros = clientes.filter(c => (c.puntos || 0) >= n.min && (c.puntos || 0) <= n.max)
            return (
              <div key={n.nombre} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid ' + theme.border }}>
                <div style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{n.nombre === 'Oro' ? '1' : n.nombre === 'Plata' ? '2' : n.nombre === 'VIP' ? '3' : '4'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: n.color }}>{n.nombre}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{n.min} - {n.max === Infinity ? 'inf' : n.max} puntos - <strong>{miembros.length} clientes</strong></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderHistorial = () => {
    const ventasConCliente = ventas.filter(v => v.clienteId).map(v => {
      const cli = clientes.find(c => c.id === v.clienteId)
      return { ...v, clienteNombre: cli?.nombre || 'Sin cliente' }
    })

    return (
      <div>
        <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>FECHA</th>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>CLIENTE</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>TOTAL</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, borderBottom: '1px solid ' + theme.border, color: theme.textDim }}>ITEMS</th>
              </tr>
            </thead>
            <tbody>
              {ventasConCliente.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: theme.textDim }}>No hay historial de compras</td></tr>
              ) : ventasConCliente.map(v => (
                <tr key={v.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{new Date(v.createdAt || v.created_at).toLocaleDateString('es-VE')}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, fontWeight: 600, color: theme.text }}>{v.clienteNombre}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: theme.green }}>{formatMoney(v.total || 0)}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid ' + theme.border, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{Array.isArray(v.items) ? v.items.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderViewContent = () => {
    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: theme.textDim }}>Cargando...</div>

    switch (view) {
      case 'directorio':
        return renderDirectorio()
      case 'cxc':
        return renderCxC()
      case 'fidelizacion':
        return renderFidelizacion()
      case 'historial':
        return renderHistorial()
      default:
        return <div style={{ padding: 20, color: theme.textDim }}>Proximamente</div>
    }
  }

  const navItems: { id: View; label: string }[] = [
    { id: 'directorio', label: 'Directorio' },
    { id: 'cxc', label: 'Cuentas por Cobrar' },
    { id: 'fidelizacion', label: 'Fidelizacion' },
    { id: 'historial', label: 'Historial' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text }}>
      <div style={{ width: 220, background: theme.surface, borderRight: '1px solid ' + theme.border, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 9, fontFamily: 'DM Mono, monospace', color: theme.textDim, letterSpacing: 2 }}>CLIENTES</div>
        {navItems.map(item => (
          <div
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              borderLeft: view === item.id ? '2px solid ' + theme.orange : '2px solid transparent',
              background: view === item.id ? 'rgba(255,124,32,0.1)' : 'transparent',
              color: view === item.id ? theme.orange : theme.textMid,
              fontSize: 11,
            }}
          >
            {item.label}
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid ' + theme.border }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: theme.textDim, marginBottom: 6 }}>DATOS</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: theme.textDim }}>
            {dataSource === 'demo' ? 'Datos de demostracion' : dataSource === 'supabase' ? 'Supabase (nube)' : 'IndexedDB local'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {view === 'directorio' ? 'Directorio de clientes' : view === 'cxc' ? 'Cuentas por Cobrar' : view === 'fidelizacion' ? 'Programa de Fidelizacion' : view === 'historial' ? 'Historial de Compras' : 'CRM'}
        </div>
        <div style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
          {view === 'directorio' ? filteredClientes.length + ' clientes registrados' : view === 'cxc' ? 'Cuentas activas' : view === 'fidelizacion' ? 'Niveles basados en puntos acumulados' : ''}
        </div>
        {renderViewContent()}
      </div>

      {showModal === 'cliente' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }} onClick={() => setShowModal(null)}>
          <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 14, padding: 22, width: '100%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>Nuevo cliente</div>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: 18, cursor: 'pointer', padding: 0 }}>X</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: theme.textDim, textTransform: 'uppercase' }}>NOMBRE *</label>
                <input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} style={{ background: theme.surface2, border: '1px solid ' + theme.border, borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 12, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: theme.textDim, textTransform: 'uppercase' }}>TELEFONO</label>
                <input value={formData.tel} onChange={e => setFormData({ ...formData, tel: e.target.value })} style={{ background: theme.surface2, border: '1px solid ' + theme.border, borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 12, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: theme.textDim, textTransform: 'uppercase' }}>EMAIL</label>
                <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ background: theme.surface2, border: '1px solid ' + theme.border, borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 12, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + theme.border }}>
              <button onClick={() => setShowModal(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid ' + theme.border, background: 'transparent', color: theme.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearCliente} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: theme.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {selectedCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 950 }} onClick={() => setSelectedCliente(null)}>
          <div style={{ background: theme.surface, border: '1px solid ' + theme.border, borderRadius: 14, padding: 22, maxWidth: 520, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{selectedCliente.nombre}</div>
                <div style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DM Mono, monospace' }}>{selectedCliente.tel} {selectedCliente.email ? ' - ' + selectedCliente.email : ''}</div>
              </div>
              <button onClick={() => setSelectedCliente(null)} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: 18, cursor: 'pointer', padding: 0 }}>X</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1 }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>VISITAS</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.text }}>{selectedCliente.visitas || 0}</div>
              </div>
              <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1 }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>GASTO TOTAL</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.green }}>{formatMoney(selectedCliente.gasto || 0)}</div>
              </div>
              <div style={{ background: theme.surface2, borderRadius: 8, padding: 12, flex: 1 }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 4 }}>PUNTOS</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: theme.amber }}>{selectedCliente.puntos || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}