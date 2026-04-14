'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase.client'
import type { License } from '@/types'

interface KDSItem {
  uid: string
  name: string
  qty: number
  cat?: string
  mods?: string[]
  nota?: string
  done: boolean
}

interface Comanda {
  id: string
  mesa: string
  mesero: string
  station: string
  status: 'pending' | 'cooking' | 'ready' | 'bumped'
  items: KDSItem[]
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

interface Props {
  license: License
}

const WARN_MIN = 8
const LATE_MIN = 15

const STATIONS: Record<string, { label: string; icon: string; cats: string[] }> = {
  cocina: { label: 'Cocina', icon: '🔥', cats: ['carnes', 'aves', 'mariscos', 'pastas', 'sopas', 'entradas', 'ensaladas', 'postres', 'hamburguesas', 'sandwiches', 'menu-dia'] },
  horno: { label: 'Pizzas', icon: '🍕', cats: ['pizzas'] },
  barra: { label: 'Barra', icon: '🍹', cats: ['bebidas', 'cocteles', 'vinos', 'cervezas'] },
}

function getStation(cat: string): string {
  for (const [id, s] of Object.entries(STATIONS)) {
    if (s.cats.includes(cat)) return id
  }
  return 'cocina'
}

const DEMO_ITEMS = [
  { name: 'Lomo a la plancha', qty: 1, cat: 'carnes', mods: ['Sin sal', 'Término medio'] },
  { name: 'Pollo al ajillo', qty: 2, cat: 'aves', mods: ['Extra salsa'] },
  { name: 'Pizza Margarita', qty: 1, cat: 'pizzas', mods: ['Borde relleno'] },
  { name: 'Pizza Pepperoni', qty: 1, cat: 'pizzas', mods: [] },
  { name: 'Mojito', qty: 3, cat: 'cocteles', mods: [] },
  { name: 'Pasta Carbonara', qty: 1, cat: 'pastas', mods: ['Sin pimienta'] },
  { name: 'Ensalada César', qty: 2, cat: 'ensaladas', mods: [] },
  { name: 'Sopa de pollo', qty: 1, cat: 'sopas', mods: [], nota: 'Sin cilantro' },
  { name: 'Cerveza Polar', qty: 4, cat: 'cervezas', mods: ['Bien fría'] },
]

const MESAS = ['M1', 'M2', 'M3', 'M5', 'M7', 'M8', 'V2', 'T1', 'T3', 'B2', 'B5', 'P1']
const MESEROS = ['Ana Q.', 'Carlos R.', 'Luis P.', 'María G.']

export function KDS({ license }: Props) {
  const [orders, setOrders] = useState<Comanda[]>([])
  const [bumped, setBumped] = useState<Comanda[]>([])
  const [soundOn, setSoundOn] = useState(true)
  const [currentStation, setCurrentStation] = useState('all')
  const [showRecalled, setShowRecalled] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [clock, setClock] = useState('')
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const renderKey = useRef(0)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const playTone = useCallback((freq: number, duration: number, vol = 0.35, type: OscillatorType = 'sine', delay = 0) => {
    if (!soundOn) return
    try {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration + 0.05)
    } catch (e) { }
  }, [soundOn, getAudioCtx])

  const playBeep = useCallback((type: string) => {
    if (!soundOn) return
    switch (type) {
      case 'new':
        playTone(660, 0.12, 0.4, 'square', 0)
        playTone(880, 0.12, 0.4, 'square', 0.15)
        playTone(1100, 0.18, 0.4, 'square', 0.30)
        break
      case 'start':
        playTone(660, 0.1, 0.25, 'sine', 0)
        playTone(880, 0.1, 0.25, 'sine', 0.15)
        break
      case 'ready':
        playTone(784, 0.15, 0.3, 'sine', 0)
        playTone(988, 0.15, 0.3, 'sine', 0)
        playTone(1175, 0.25, 0.3, 'sine', 0.15)
        break
      case 'bump':
        playTone(440, 0.2, 0.2, 'sine', 0)
        break
      case 'warn':
        playTone(440, 0.1, 0.35, 'square', 0)
        playTone(440, 0.1, 0.35, 'square', 0.18)
        playTone(440, 0.1, 0.35, 'square', 0.36)
        break
    }
  }, [soundOn, playTone])

  const unlockAudio = useCallback(() => {
    try {
      getAudioCtx()
      playBeep('new')
      setAudioUnlocked(true)
    } catch (e) { }
  }, [getAudioCtx, playBeep])

  const fetchOrders = useCallback(async () => {
    if (!license?.tenantId) return
    const { data } = await supabase
      .from('comandas')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .in('status', ['pending', 'cooking', 'ready'])
      .order('created_at', { ascending: true })
    if (data) {
      const mapped: Comanda[] = data.map((c: any) => ({
        id: c.id,
        mesa: c.mesa,
        mesero: c.mesero,
        station: c.station || 'cocina',
        status: c.status,
        items: c.items || [],
        createdAt: new Date(c.created_at).getTime(),
        startedAt: c.started_at ? new Date(c.started_at).getTime() : null,
        completedAt: c.completed_at ? new Date(c.completed_at).getTime() : null,
      }))
      setOrders(mapped)
    }
  }, [license?.tenantId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!license?.tenantId) return

    const channel = supabase
      .channel('kds-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comandas',
          filter: `tenant_id=eq.${license.tenantId}`,
        },
        (payload) => {
          const n: any = payload.new
          const newComanda: Comanda = {
            id: n.id,
            mesa: n.mesa,
            mesero: n.mesero,
            station: n.station || 'cocina',
            status: n.status,
            items: n.items || [],
            createdAt: new Date(n.created_at).getTime(),
            startedAt: null,
            completedAt: null,
          }
          setOrders(prev => [...prev, newComanda])
          setNewOrderIds(prev => new Set(prev).add(newComanda.id))
          playBeep('new')
          setTimeout(() => {
            setNewOrderIds(prev => {
              const next = new Set(prev)
              next.delete(newComanda.id)
              return next
            })
          }, 500)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comandas',
          filter: `tenant_id=eq.${license.tenantId}`,
        },
        (payload) => {
          const n: any = payload.new
          setOrders(prev => prev.map(o => o.id === n.id ? {
            ...o,
            status: n.status,
            startedAt: n.started_at ? new Date(n.started_at).getTime() : o.startedAt,
            completedAt: n.completed_at ? new Date(n.completed_at).getTime() : o.completedAt,
            items: n.items || o.items,
          } : o))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [license?.tenantId, playBeep])

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    setClock(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      renderKey.current++
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const addDemoOrder = useCallback(() => {
    const mesa = MESAS[Math.floor(Math.random() * MESAS.length)]
    const mesero = MESEROS[Math.floor(Math.random() * MESEROS.length)]
    const numItems = 1 + Math.floor(Math.random() * 4)
    const shuffled = [...DEMO_ITEMS].sort(() => Math.random() - 0.5).slice(0, numItems)

    const byStation: Record<string, KDSItem[]> = {}
    shuffled.forEach(item => {
      const st = getStation(item.cat)
      if (!byStation[st]) byStation[st] = []
      byStation[st].push({
        uid: Math.random().toString(36).slice(2),
        name: item.name,
        qty: item.qty,
        cat: item.cat,
        mods: item.mods,
        nota: item.nota,
        done: false,
      })
    })

    Object.entries(byStation).forEach(([station, items]) => {
      const newOrder: Comanda = {
        id: 'O-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        mesa,
        mesero,
        station,
        status: 'pending',
        items,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
      }
      setOrders(prev => [...prev, newOrder])
      playBeep('new')
    })
  }, [playBeep])

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string, items?: KDSItem[]) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const updated = { ...o, status: newStatus as Comanda['status'] }
      if (newStatus === 'cooking') {
        updated.startedAt = Date.now()
      } else if (newStatus === 'ready') {
        updated.items.forEach(i => i.done = true)
      } else if (newStatus === 'bumped') {
        updated.completedAt = Date.now()
      }
      if (items) updated.items = items
      return updated
    }))

    if (newStatus === 'bumped') {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setBumped(prev => [{ ...order, status: 'bumped', completedAt: Date.now() }, ...prev])
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }
    }

    if (license?.tenantId) {
      await supabase.from('comandas').update({
        status: newStatus,
        started_at: newStatus === 'cooking' ? new Date().toISOString() : null,
        completed_at: newStatus === 'bumped' ? new Date().toISOString() : null,
        items: items || orders.find(o => o.id === orderId)?.items,
      }).eq('id', orderId).eq('tenant_id', license.tenantId)
    }

    if (newStatus === 'cooking') playBeep('start')
    else if (newStatus === 'ready') playBeep('ready')
    else if (newStatus === 'bumped') playBeep('bump')
  }, [orders, license?.tenantId, playBeep])

  const toggleItem = useCallback((orderId: string, uid: string) => {
    setOrders(prev => {
      const newOrders = prev.map(o => {
        if (o.id !== orderId) return o
        const newItems = o.items.map(i => i.uid === uid ? { ...i, done: !i.done } : i)
        return { ...o, items: newItems }
      })
      const order = newOrders.find(o => o.id === orderId)
      if (order && order.items.every(i => i.done) && order.status === 'cooking') {
        updateOrderStatus(orderId, 'ready', order.items)
      }
      return newOrders
    })
  }, [updateOrderStatus])

  const advanceOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    if (order.status === 'pending') {
      updateOrderStatus(orderId, 'cooking')
    } else if (order.status === 'cooking') {
      updateOrderStatus(orderId, 'ready')
    }
  }, [orders, updateOrderStatus])

  const bumpOrder = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'bumped')
  }, [updateOrderStatus])

  const recallOrder = useCallback((orderId: string) => {
    const order = bumped.find(o => o.id === orderId)
    if (!order) return
    setBumped(prev => prev.filter(o => o.id !== orderId))
    setOrders(prev => [...prev, { ...order, status: 'cooking', startedAt: Date.now(), completedAt: null, items: order.items.map(i => ({ ...i, done: false })) }])
    setShowRecalled(false)
    playBeep('start')
  }, [bumped, playBeep])

  const cols = { pending: [] as Comanda[], cooking: [] as Comanda[], ready: [] as Comanda[], late: [] as Comanda[] }
  const now = Date.now()

  orders.forEach(o => {
    const mins = (now - o.createdAt) / 60000
    if (o.status === 'pending') {
      if (mins >= LATE_MIN) cols.late.push(o)
      else cols.pending.push(o)
    } else if (o.status === 'cooking') {
      if (mins >= LATE_MIN) cols.late.push(o)
      else cols.cooking.push(o)
    } else if (o.status === 'ready') {
      cols.ready.push(o)
    }
  })

  const filter = currentStation === 'all'
    ? (arr: Comanda[]) => arr
    : (arr: Comanda[]) => arr.filter(o => o.station === currentStation)

  const allActive = orders.filter(o => o.status !== 'bumped')

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg, #060b09)',
      overflow: 'hidden',
    }}>
      {/* TOPBAR */}
      <div className="topbar" style={{
        height: 52,
        background: 'var(--surface, #0c1410)',
        borderBottom: '2px solid var(--border, #1c2e20)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 14, borderRight: '1px solid var(--border, #1c2e20)' }}>
          <div style={{ fontSize: 20 }}>📺</div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--text, #d0ead4)' }}>KDS</div>
            <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: 'var(--text-dim, #2a4a2e)', letterSpacing: 2 }}>COCINA</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <KpiDot color="var(--pending, #ff8c00)" />
          <span style={{ fontSize: 11, color: 'var(--text-mid, #507858)' }}>Pendiente</span>
          <b style={{ fontSize: 13 }}>{filter(cols.pending).length}</b>
          <KpiDot color="var(--cooking, #38b6ff)" />
          <span style={{ fontSize: 11, color: 'var(--text-mid, #507858)' }}>En cocina</span>
          <b style={{ fontSize: 13 }}>{filter(cols.cooking).length}</b>
          <KpiDot color="var(--ready, #2ee87a)" />
          <span style={{ fontSize: 11, color: 'var(--text-mid, #507858)' }}>Listo</span>
          <b style={{ fontSize: 13 }}>{filter(cols.ready).length}</b>
          <KpiDot color="var(--late, #ff3b4e)" />
          <span style={{ fontSize: 11, color: 'var(--text-mid, #507858)' }}>Tardío</span>
          <b style={{ fontSize: 13 }}>{filter(cols.late).length}</b>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>{clock}</div>
          <button className="tbtn" onClick={() => setSoundOn(!soundOn)} style={{
            height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border, #1c2e20)',
            background: 'transparent', color: 'var(--text-mid, #507858)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            {soundOn ? '🔔' : '🔕'}
          </button>
          <button className="tbtn" onClick={addDemoOrder} style={{
            height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border, #1c2e20)',
            background: 'transparent', color: 'var(--text-mid, #507858)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>+ Demo</button>
          <button className="tbtn" onClick={() => setShowRecalled(true)} style={{
            height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border, #1c2e20)',
            background: 'transparent', color: 'var(--text-mid, #507858)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>🔁 Bumpeados</button>
        </div>
      </div>

      {/* STATION TABS */}
      <div className="station-bar" style={{
        height: 38,
        background: 'var(--surface, #0c1410)',
        borderBottom: '1px solid var(--border, #1c2e20)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 6,
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {[
          { id: 'all', label: '📺 Todo', count: allActive.length },
          { id: 'cocina', label: '🔥 Cocina', count: allActive.filter(o => o.station === 'cocina').length },
          { id: 'horno', label: '🍕 Pizzas', count: allActive.filter(o => o.station === 'horno').length },
          { id: 'barra', label: '🍹 Barra', count: allActive.filter(o => o.station === 'barra').length },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setCurrentStation(s.id)}
            style={{
              height: 26,
              padding: '0 12px',
              borderRadius: 5,
              border: `1px solid ${currentStation === s.id ? 'var(--border2, #254030)' : 'var(--border, #1c2e20)'}`,
              background: currentStation === s.id ? 'var(--surface3, #14201a)' : 'transparent',
              color: currentStation === s.id ? 'var(--text, #d0ead4)' : 'var(--text-mid, #507858)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'DM Mono, monospace',
              letterSpacing: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {s.label}
            <span style={{
              fontSize: 11, fontWeight: 700, background: 'rgba(255,140,0,0.12)', color: 'var(--pending, #ff8c00)',
              borderRadius: 10, padding: '0 5px', minWidth: 18, textAlign: 'center',
            }}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* COL HEADERS */}
      <div style={{
        display: 'grid',
        height: 34,
        background: 'var(--surface2, #101a12)',
        borderBottom: '1px solid var(--border, #1c2e20)',
        gridTemplateColumns: 'repeat(4, 1fr)',
        flexShrink: 0,
      }}>
        {[
          { key: 'pending', label: 'Pendiente', color: 'var(--pending, #ff8c00)' },
          { key: 'cooking', label: 'En cocina', color: 'var(--cooking, #38b6ff)' },
          { key: 'ready', label: 'Listo', color: 'var(--ready, #2ee87a)' },
          { key: 'late', label: 'Tardío', color: 'var(--late, #ff3b4e)' },
        ].map(c => (
          <div key={c.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
            borderRight: '1px solid var(--border, #1c2e20)', color: 'var(--text-mid, #507858)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
            {c.label}
            <span style={{ fontSize: 12, fontWeight: 700 }}>{filter(cols[c.key as keyof typeof cols]).length}</span>
          </div>
        ))}
      </div>

      {/* BOARD */}
      <div style={{
        display: 'grid',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}>
        {(['pending', 'cooking', 'ready', 'late'] as const).map(colKey => (
          <div key={colKey} style={{
            borderRight: '1px solid var(--border, #1c2e20)',
            overflowY: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}>
            {filter(cols[colKey]).length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
                flexDirection: 'column', gap: 6, color: 'var(--text-dim, #2a4a2e)', fontFamily: 'DM Mono, monospace',
                fontSize: 10, letterSpacing: 1, textAlign: 'center', padding: 20,
              }}>
                <div style={{ fontSize: 28, opacity: 0.3 }}>{colKey === 'pending' ? '⏳' : colKey === 'cooking' ? '👨‍🍳' : colKey === 'ready' ? '✅' : '⚠️'}</div>
                <div>{colKey === 'pending' ? 'Sin pendientes' : colKey === 'cooking' ? 'Nada en cocina' : colKey === 'ready' ? 'Nada listo' : 'Sin tardíos'}</div>
              </div>
            ) : (
              filter(cols[colKey]).map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type={colKey === 'cooking' && (now - order.createdAt) / 60000 < LATE_MIN ? 'cooking' : colKey}
                  isNew={newOrderIds.has(order.id)}
                  onToggleItem={toggleItem}
                  onAdvance={advanceOrder}
                  onBump={bumpOrder}
                />
              ))
            )}
          </div>
        ))}
      </div>

      {/* SOUND UNLOCK OVERLAY */}
      {!audioUnlocked && (
        <div
          onClick={unlockAudio}
          style={{
            position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 52 }}>🔔</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: '#d0ead4' }}>
            Toca para activar el sonido
          </div>
          <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#507858', letterSpacing: 1 }}>
            KDS · ZytekOS · Cocina
          </div>
          <div style={{
            marginTop: 8, padding: '10px 28px', borderRadius: 8, background: 'rgba(46,232,122,0.15)',
            border: '1px solid rgba(46,232,122,0.4)', color: '#2ee87a', fontSize: 13, fontWeight: 700,
          }}>
            Toca en cualquier lugar para continuar
          </div>
        </div>
      )}

      {/* RECALL MODAL */}
      {showRecalled && (
        <div
          onClick={() => setShowRecalled(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface, #0c1410)', border: '1px solid var(--border2, #254030)', borderRadius: 12,
              padding: 20, maxWidth: 560, width: '90%',
            }}
          >
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔁 Órdenes Bumpeadas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
              {bumped.length === 0 ? (
                <div style={{ color: 'var(--text-mid, #507858)', textAlign: 'center', padding: 20 }}>No hay órdenes bumpeadas aún.</div>
              ) : (
                bumped.map(o => (
                  <div key={o.id} style={{
                    background: 'var(--surface2, #101a12)', border: '1px solid var(--border2, #254030)',
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 900 }}>{o.mesa}</span>
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text-mid, #507858)' }}>{o.mesero}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text-mid, #507858)' }}>
                        Bumpeado {timeSince(o.completedAt || 0)}
                      </span>
                      <button
                        onClick={() => recallOrder(o.id)}
                        style={{
                          height: 24, padding: '0 8px', borderRadius: 5, border: '1px solid var(--border2, #254030)',
                          background: 'var(--surface2, #101a12)', color: 'var(--amber, #ffc040)', cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        🔁 Reactivar
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-mid, #507858)' }}>
                      {o.items.map(i => `${i.qty}× ${i.name}`).join(' · ')}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRecalled(false)}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 5, border: '1px solid var(--border2, #254030)',
                  background: 'var(--surface2, #101a12)', color: 'var(--text-mid, #507858)', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiDot({ color }: { color: string }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

interface OrderCardProps {
  order: Comanda
  type: string
  isNew: boolean
  onToggleItem: (orderId: string, uid: string) => void
  onAdvance: (orderId: string) => void
  onBump: (orderId: string) => void
}

function OrderCard({ order, type, isNew, onToggleItem, onAdvance, onBump }: OrderCardProps) {
  const now = Date.now()
  const mins = (now - order.createdAt) / 60000
  const timerClass = mins >= LATE_MIN ? 'timer-late' : mins >= WARN_MIN ? 'timer-warn' : 'timer-ok'
  const timerLabel = mins < 1 ? `${Math.floor(mins * 60)}s` : `${Math.floor(mins)}min`

  const stInfo = STATIONS[order.station] || { icon: '🍽️', label: 'Cocina' }
  const doneCount = order.items.filter(i => i.done).length
  const totalCount = order.items.length

  const bgcolor = {
    pending: 'rgba(255,140,0,0.12)',
    cooking: 'rgba(56,182,255,0.11)',
    ready: 'rgba(46,232,122,0.11)',
    late: 'rgba(255,59,78,0.14)',
  }[type] || 'transparent'

  const bordercolor = {
    pending: 'rgba(255,140,0,0.4)',
    cooking: 'rgba(56,182,255,0.4)',
    ready: 'rgba(46,232,122,0.45)',
    late: 'rgba(255,59,78,0.5)',
  }[type] || 'transparent'

  const timercss = {
    timer_ok: { background: 'rgba(46,232,122,0.11)', color: '#2ee87a', border: '1px solid rgba(46,232,122,0.45)' },
    timer_warn: { background: 'rgba(255,192,64,0.12)', color: '#ffc040', border: '1px solid rgba(255,192,64,0.35)' },
    timer_late: { background: 'rgba(255,59,78,0.14)', color: '#ff3b4e', border: '1px solid rgba(255,59,78,0.5)' },
  }

  return (
    <div style={{
      borderRadius: 9, padding: '10px 11px', border: `2px solid ${bordercolor}`, background: bgcolor,
      position: 'relative', transition: 'transform 0.13s, box-shadow 0.13s',
      animation: isNew ? 'cardIn 0.3s ease-out' : type === 'late' ? 'latePulse 2s ease-in-out infinite' : undefined,
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes latePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,78,0) } 50% { box-shadow: 0 0 0 6px rgba(255,59,78,0.2) } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(-8px) scale(0.97) } to { opacity: 1; transform: none } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900 }}>{order.mesa}</div>
        <div style={{ fontSize: 10, color: 'var(--text-mid, #507858)', fontFamily: 'DM Mono, monospace', flex: 1 }}>{order.mesero}</div>
        <div style={{
          fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 1,
          padding: '1px 5px', borderRadius: 3, background: 'var(--surface3, #14201a)', color: 'var(--text-mid, #507858)',
          border: '1px solid var(--border2, #254030)', textTransform: 'uppercase', flexShrink: 0,
        }}>
          {stInfo.icon} {stInfo.label}
        </div>
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4, flexShrink: 0, ...timercss[timerClass as keyof typeof timercss],
        }}>
          {timerLabel}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {order.items.map(item => (
          <div
            key={item.uid}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              opacity: item.done ? 0.45 : 1,
              textDecoration: item.done ? 'line-through' : 'none',
            }}
          >
            <div
              onClick={() => onToggleItem(order.id, item.uid)}
              style={{
                width: 18, height: 18, borderRadius: 4, border: `1px solid ${item.done ? 'rgba(46,232,122,0.45)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer',
                flexShrink: 0, marginTop: 1, transition: 'all 0.15s',
                background: item.done ? 'rgba(46,232,122,0.11)' : 'rgba(255,255,255,0.04)',
                color: item.done ? '#2ee87a' : 'transparent',
              }}
            >
              {item.done ? '✓' : ''}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
              ×{item.qty}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, lineHeight: 1.35 }}>{item.name}</div>
              {item.mods?.length ? (
                <div style={{ fontSize: 10, color: 'var(--text-mid, #507858)', marginTop: 2, lineHeight: 1.3 }}>
                  {item.mods.map(m => `• ${m}`).join(' ')}
                </div>
              ) : null}
              {item.nota ? (
                <div style={{ fontSize: 10, color: '#ffc040', marginTop: 2, fontStyle: 'italic' }}>📝 {item.nota}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: 'var(--text-mid, #507858)' }}>
          {doneCount}/{totalCount} listos
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => onAdvance(order.id)}
            style={{
              height: 24, padding: '0 8px', borderRadius: 5, border: '1px solid rgba(46,232,122,0.45)',
              background: 'rgba(46,232,122,0.11)', color: '#2ee87a', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {type === 'ready' ? '✓ Servido' : type === 'cooking' ? '✓ Listo' : '▶ Cocinar'}
          </button>
          {type === 'ready' && (
            <button
              onClick={() => onBump(order.id)}
              style={{
                height: 24, padding: '0 8px', borderRadius: 5, border: '1px solid rgba(46,232,122,0.45)',
                background: 'rgba(46,232,122,0.11)', color: '#2ee87a', cursor: 'pointer',
                fontSize: 10, fontWeight: 700, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ✓ Listo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function timeSince(ts: number): string {
  if (!ts) return '0s'
  const s = (Date.now() - ts) / 1000
  if (s < 60) return `${Math.floor(s)}s`
  return `${Math.floor(s / 60)}min`
}