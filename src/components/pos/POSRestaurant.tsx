'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Subscription, MenuItem, ZytekUser } from '@/types'
import { supabase } from '@/lib/supabase.client'
import bcrypt from 'bcryptjs'
import { PAIS_CONFIG, type PaisId, readPaisLocal, readTasaLocal, writeTasaLocal } from '@/lib/paises'
import { getAvatarColor } from '@/lib/utils/avatar'
import { ConnectionIndicator } from './ConnectionIndicator'

console.log('💎 POSRestaurant.tsx: File loaded in browser')
console.log('🌐 Supabase Config:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING'
})

interface MenuModifier {
  id: string
  nombre: string
  emoji: string
  tipo: 'contorno' | 'extra' | 'sin' | 'seleccion'
  precio: number
}

interface MenuCategory {
  id: string
  nombre: string
  emoji: string
  has_subgroups: boolean
}

interface Subgrupo {
  id: string
  categoria_id: string
  nombre: string
  emoji: string
}

interface MetodoPago {
  id: string
  label: string
  icon: string
  activo: boolean
  orden: number
}

  // El sistema buscará dinámicamente en el estado de modificadores


// El sistema utiliza ahora validación por Base de Datos (BCrypt)

type AuthAction =
  | 'abrirMesa' | 'anularPlato' | 'anularOrden' | 'descuento' | 'abrirCredito'
  | 'registrarAbono' | 'cobrar' | 'enviarCocina' | 'corteZ' | 'corteX'
  | 'actualizarTasa'

const AUTH_NIVEL_MIN: Record<AuthAction, number> = {
  abrirMesa: 5,
  anularPlato: 3,
  anularOrden: 3,
  descuento: 3,
  abrirCredito: 3,
  corteZ: 3,
  actualizarTasa: 3,
  registrarAbono: 4,
  cobrar: 4,
  corteX: 4,
  enviarCocina: 5,
}

const MESAS_POR_PAGINA = 25
const BILLETES_USD = [100, 50, 20, 10, 5, 1]
const BILLETES_BS = [200, 100, 50, 20, 10, 5, 2, 1]
const SISTEMA_FPAGO_DEMO: Record<string, number> = {
  'efectivo-usd': 245.50, 'efectivo-bs': 180.00, 'tarjeta': 420.00,
  'zelle': 310.00, 'pago-movil': 95.00, 'divisa': 180.00,
}

function formatElapsed(start?: Date): string | null {
  if (!start) return null
  const ms = Date.now() - start.getTime()
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 1) return `0:${s.toString().padStart(2, '0')}`
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`
  const h = Math.floor(m / 60)
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`
}

function getElapsedColor(start?: Date, slaMinutos?: { warn: number; danger: number }): string {
  if (!start) return '#5DCAA5'
  const m = Math.floor((Date.now() - start.getTime()) / 60000)
  const warn = slaMinutos?.warn ?? 45
  const danger = slaMinutos?.danger ?? 90
  if (m >= danger) return '#F09595'
  if (m >= warn) return '#EF9F27'
  return '#5DCAA5'
}

const AMBIENTES = [
  { id: 'salon', nombre: 'Salón', emoji: '🏛️' },
  { id: 'vip', nombre: 'VIP', emoji: '⭐' },
  { id: 'terraza', nombre: 'Terraza', emoji: '🌿' },
  { id: 'privado', nombre: 'Privado', emoji: '🔒' },
  { id: 'barra', nombre: 'Barra', emoji: '🍺' },
]

const FORMAS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'zelle', label: 'Zelle', icon: '📱' },
  { id: 'pago-movil', label: 'Pago Móvil', icon: '📲' },
  { id: 'divisa', label: 'Divisa', icon: '💲' },
  { id: 'credito', label: 'Crédito', icon: '📋' },
]

  // Se cargan dinámicamente de metodos_pago


type TableStatus = 'libre' | 'ocupada' | 'cuenta' | 'reservada' | 'deuda'
type View = 'login' | 'destino' | 'mesas' | 'comanda'
type MenuStep = 'cats' | 'subgrupo' | 'prods' | 'mods'

interface Table {
  id: string
  numero: number
  nombre: string
  ambiente?: string
  zona_id?: string
  grid_x: number
  grid_y: number
  grid_page: number
  capacidad: number
  estado: TableStatus
  pedido?: OrderItem[]
  cliente?: string | { id: string; nombre: string; tel?: string }
  monto?: number
  opened?: Date
  subcuentas?: Array<{ id: string; monto: number; pagada?: boolean }>
}

interface OrderItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
  modificadores?: MenuModifier[]
  modsForced?: MenuModifier[]
  modsOptional?: MenuModifier[]
  variante?: string
  nota?: string
  enviado?: boolean
  uid: string
  menu_item_id: string
}


export default function POSRestaurant({ subscription }: { subscription: Subscription }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentView, setCurrentView] = useState<View>('mesas')
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [zonas, setZonas] = useState<any[]>([])
  const [currentZonaId, setCurrentZonaId] = useState<string | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  // ── INIT ──
  useEffect(() => {
    console.log('🚀 POSRestaurant: Component Mounted')
    console.log('👤 Current State:', { currentUser: currentUser?.nombre, currentView })
  }, [])
  const [subGrupos, setSubGrupos] = useState<Subgrupo[]>([])
  const [modifiers, setModifiers] = useState<MenuModifier[]>([])
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null)
  const [lastTotal, setLastTotal] = useState(0)

  const [currentCat, setCurrentCat] = useState<string>('')
  const [currentSubgrupo, setCurrentSubgrupo] = useState<Subgrupo | null>(null)
  const [menuStep, setMenuStep] = useState<MenuStep>('cats')
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)
  const [modsForced, setModsForced] = useState<MenuModifier[]>([])
  const [modsOptional, setModsOptional] = useState<MenuModifier[]>([])
  
  const MOD = (id: string): MenuModifier | null => modifiers.find(m => m.id === id) || null
  const MODS = (ids: string[]): MenuModifier[] => ids.map(MOD).filter((m): m is MenuModifier => m !== null)

  const [note, setNote] = useState('')
  const [showCobrar, setShowCobrar] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('efectivo')
  const [cobroPagos, setCobroPagos] = useState<Array<{ formaId: string; nombre: string; emoji: string; montoUSD: number; montoDisplay: string }>>([])
  const [cobroTipPct, setCobroTipPct] = useState(0)
  const [pagoPopup, setPagoPopup] = useState<{ fpagoId: string; esBs: boolean } | null>(null)
  const [pagoInput, setPagoInput] = useState('')
  const [pin, setPin] = useState('')
  const [currentUser, setCurrentUser] = useState<ZytekUser | null>(null)
  const [posSettings, setPosSettings] = useState<POSSettings | null>(null)
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [showAuthOverlay, setShowAuthOverlay] = useState(false)
  const [authCallback, setAuthCallback] = useState<(() => void) | null>(null)
  const [authMinNivel, setAuthMinNivel] = useState(2)
  const [authActionLabel, setAuthActionLabel] = useState<string>('')
  const [authError, setAuthError] = useState('')
  const [pinFailedCount, setPinFailedCount] = useState(0)
  const [pinBlockedUntil, setPinBlockedUntil] = useState<number | null>(null)
  const [pinCountdown, setPinCountdown] = useState(0)
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; sub: string; severity: 'low' | 'medium' | 'high' }>>([])
  const [pendingCancel, setPendingCancel] = useState<{ itemUid: string; delta: number; motivo: string } | null>(null)
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [itemOpTarget, setItemOpTarget] = useState<string | null>(null)
  const [itemMsgInput, setItemMsgInput] = useState('')
  const [currentPais, setCurrentPais] = useState<PaisId>('ve')
  const [tasaBCV, setTasaBCV] = useState<number>(PAIS_CONFIG.ve.tasaDefault)
  const [showTasaModal, setShowTasaModal] = useState(false)
  const [tasaInput, setTasaInput] = useState('')
  const paisCfg = PAIS_CONFIG[currentPais]

  // ── Venta Directa ──
  const iniciarVentaDirecta = () => {
    setQuickClientData({ idFiscal: '', nombre: '', whatsapp: '', direccion: '' })
    setShowQuickClientModal(true)
  }

  const handleConfirmQuickClient = (isFinalConsumer: boolean) => {
    let clientInfo: Table['cliente'] = 'Consumidor Final'
    
    if (!isFinalConsumer) {
      clientInfo = {
        id: 'new_' + Date.now(),
        nombre: quickClientData.nombre || 'Consumidor Final',
        tel: quickClientData.whatsapp,
        // @ts-ignore - added via migration
        id_fiscal: quickClientData.idFiscal,
        direccion: quickClientData.direccion,
      }
    }

    const directSaleTable: Table = {
      id: `DIRECTA-${Date.now()}`,
      numero: 0,
      nombre: isFinalConsumer ? 'Venta Directa' : `Directa - ${quickClientData.nombre}`,
      ambiente: 'directa',
      capacidad: 0,
      estado: 'ocupada',
      pedido: [],
      opened: new Date(),
      cliente: clientInfo,
    }
    
    setSelectedTable(directSaleTable)
    setShowQuickClientModal(false)
    setCurrentView('comanda')
  }

  const handleIdFiscalChange = async (val: string) => {
    setQuickClientData(prev => ({ ...prev, idFiscal: val }))
    if (val.length >= 5) {
      const found = clientes.find(c => (c as any).id_fiscal === val || c.tel === val)
      if (found) {
        setQuickClientData(prev => ({
          ...prev,
          nombre: found.nombre,
          whatsapp: found.tel || '',
          direccion: (found as any).direccion || '',
        }))
      }
    }
  }

  useEffect(() => {
    const p = readPaisLocal()
    setCurrentPais(p)
    const t = readTasaLocal()
    setTasaBCV(t ?? PAIS_CONFIG[p].tasaDefault)
    const onPais = (e: Event) => {
      const id = (e as CustomEvent<PaisId>).detail
      setCurrentPais(id)
      const currentT = readTasaLocal()
      if (currentT == null) setTasaBCV(PAIS_CONFIG[id].tasaDefault)
    }
    const onTasa = (e: Event) => setTasaBCV((e as CustomEvent<number>).detail)
    window.addEventListener('zk:pais-change', onPais)
    window.addEventListener('zk:tasa-change', onTasa)

    // Suscribirse a alertas de auditoría
    import('@/services/audit-service').then(({ AuditService }) => {
      // @ts-ignore
      window.AuditService = AuditService // Para acceso global en debug
      // Simulación de listener de alertas realtime
      const checkAlerts = setInterval(() => {
        // En prod esto sería un canal de Supabase Realtime sobre pos_audit_trace con 'is_anomaly=true'
      }, 5000)
      return () => clearInterval(checkAlerts)
    })

    // Inicializar SyncService
    import('@/services/sync-service').then(({ SyncService }) => {
      SyncService.startSyncCycle()
    })

    // Detectar estado offline
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('zk:pais-change', onPais)
      window.removeEventListener('zk:tasa-change', onTasa)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const lastAuthUserRef = useRef<ZytekUser | null>(null)
  const [clock, setClock] = useState<{ date: string; time: string }>({ date: '--/--/----', time: '--:--' })
  const [gridPage, setGridPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Utilidad para Pantalla Completa
  const toggleFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        const doc = document.documentElement;
        if (doc.requestFullscreen) doc.requestFullscreen();
        else if ((doc as any).webkitRequestFullscreen) (doc as any).webkitRequestFullscreen();
        else if ((doc as any).msRequestFullscreen) (doc as any).msRequestFullscreen();
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        setIsFullscreen(false)
      }
    } catch (e) {
      console.warn('Fullscreen operation failed:', e);
    }
  }
  const [tick, setTick] = useState(0)
  const [mesaPagina, setMesaPagina] = useState(0)
  const [showCorteX, setShowCorteX] = useState(false)
  const [showCorteZ, setShowCorteZ] = useState(false)
  const [showFuncionesMesa, setShowFuncionesMesa] = useState(false)
  const [showCliente, setShowCliente] = useState(false)
  const [showDividir, setShowDividir] = useState(false)
  const [showNotaConsumo, setShowNotaConsumo] = useState(false)
  const [showFunciones, setShowFunciones] = useState(false)
  const [showDescuento, setShowDescuento] = useState(false)
  const [descuentoPct, setDescuentoPct] = useState(0)
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; tel: string; email?: string; notas?: string }>>([
    { id: 'c1', nombre: 'Juan Pérez', tel: '+58 414 123 4567', notas: 'VIP' },
    { id: 'c2', nombre: 'María García', tel: '+58 412 987 6543', email: 'mg@mail.com' },
    { id: 'c3', nombre: 'Carlos Ruiz', tel: '+1 305 555 0123' },
  ])
  const [clienteSearch, setClienteSearch] = useState('')
  const [nuevoCli, setNuevoCli] = useState({ nombre: '', tel: '', email: '', notas: '' })
  const [opMode, setOpMode] = useState<null | 'cambio' | 'fusionar'>(null)
  const [opSelecciones, setOpSelecciones] = useState<string[]>([])
  const [divModo, setDivModo] = useState<'monto' | 'items'>('monto')
  const [divPaso, setDivPaso] = useState<'modo' | 'config'>('modo')
  const [divCuentas, setDivCuentas] = useState<Array<{ monto: number }>>([])
  const [cortexBilletesUSD, setCortexBilletesUSD] = useState<Record<number, number>>({})
  const [cortexBilletesBs, setCortexBilletesBs] = useState<Record<number, number>>({})
  const [cortexSueltoUSD, setCortexSueltoUSD] = useState(0)
  const [cortexSueltoBs, setCortexSueltoBs] = useState(0)
  const [cortexFondo, setCortexFondo] = useState(0)
  const [cortexObs, setCortexObs] = useState('')
  const [cortexStep, setCortexStep] = useState<'conteo' | 'resultado'>('conteo')
  const [cortexFpagoContado, setCortexFpagoContado] = useState<Record<string, number>>({})
  const [cortezEgresos, setCortezEgresos] = useState<Array<{ concepto: string; monto: number }>>([])
  const [cortezObs, setCortezObs] = useState('')
  const [showCortezConfirm, setShowCortezConfirm] = useState(false)
  const [cortezConfirmInput, setCortezConfirmInput] = useState('')
  const [cortezNumero, setCortezNumero] = useState(1)
  const [cuentasBanco, setCuentasBanco] = useState<Array<{ id: string; banco: string; moneda: 'usd' | 'bs'; numero: string; titular: string }>>([
    { id: 'cb1', banco: 'Banesco', moneda: 'bs', numero: '0134-0000-00-0000000000', titular: 'Mi Restaurante C.A.' },
    { id: 'cb2', banco: 'BDV', moneda: 'bs', numero: '0102-0000-00-0000000000', titular: 'Mi Restaurante C.A.' },
    { id: 'cb3', banco: 'Zelle', moneda: 'usd', numero: 'pagos@negocio.com', titular: 'Daniel F.' },
  ])
  const [showCuentas, setShowCuentas] = useState(false)
  const [editCuenta, setEditCuenta] = useState<{ id: string; banco: string; moneda: 'usd' | 'bs'; numero: string; titular: string } | null>(null)
  const [showEditPin, setShowEditPin] = useState(false)
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')

  // ── Quick Client Registration (Venta Directa) ──
  const [showQuickClientModal, setShowQuickClientModal] = useState(false)
  const [quickClientData, setQuickClientData] = useState({
    idFiscal: '',
    nombre: '',
    whatsapp: '',
    direccion: '',
  })
  const [searchingClient, setSearchingClient] = useState(false)

  useEffect(() => {
    loadPOSData()
  }, [subscription.tenantId])

  // Listener global de Teclado (Escape/Enter para navegación rápida)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.key === 'Escape' || e.key === 'Enter') {
        if (e.key === 'Escape') e.preventDefault();
        
        if (showCobrar) { setShowCobrar(false); return; }
        if (showTasaModal) { setShowTasaModal(false); return; }
        if (showAuthOverlay) { setShowAuthOverlay(false); return; }
        if (showCorteX) { setShowCorteX(false); return; }
        if (showCorteZ) { setShowCorteZ(false); return; }
        if (showFuncionesMesa) { setShowFuncionesMesa(false); return; }
        if (showCliente) { setShowCliente(false); return; }
        if (showDividir) { setShowDividir(false); return; }
        if (showNotaConsumo) { setShowNotaConsumo(false); return; }
        if (showFunciones) { setShowFunciones(false); return; }
        if (showDescuento) { setShowDescuento(false); return; }
        if (showCuentas) { setShowCuentas(false); return; }
        if (showEditPin) { setShowEditPin(false); return; }
        if (showQuickClientModal) { setShowQuickClientModal(false); return; }

        if (currentView === 'comanda') {
          if (menuStep !== 'cats') {
            setMenuStep('cats');
            setSelectedProduct(null);
            setModsForced([]);
            setModsOptional([]);
            return;
          }
          setCurrentView('mesas');
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [
    currentView, menuStep, showCobrar, showTasaModal, showAuthOverlay, 
    showCorteX, showCorteZ, showFuncionesMesa, showCliente, 
    showDividir, showNotaConsumo, showFunciones, showDescuento, 
    showCuentas, showEditPin, showQuickClientModal
  ])

  const loadPOSData = async () => {
    setLoading(true)
    try {
      const { data: cats } = await supabase.from('menu_categorias').select('*').eq('tenant_id', subscription.tenantId).order('orden')
      if (cats) setCategories(cats)
      const { data: sgs } = await supabase.from('menu_subgrupos').select('*').eq('tenant_id', subscription.tenantId).order('orden')
      if (sgs) setSubGrupos(sgs)
      const { data: modsData } = await supabase.from('modificadores').select('*, mod_grupos(tipo)').eq('tenant_id', subscription.tenantId)
      if (modsData) {
        setModifiers(modsData.map((m: any) => ({
          id: m.id, nombre: m.nombre, emoji: m.emoji || '', precio: parseFloat(m.precio) || 0,
          tipo: m.mod_grupos?.tipo || 'extra'
        })))
      }
      const { data: itemsData } = await supabase.from('menu_items').select('*').eq('tenant_id', subscription.tenantId).eq('activo', true)
      if (itemsData) setItems(itemsData)
      const { data: mpData } = await supabase.from('metodos_pago').select('*').eq('tenant_id', subscription.tenantId).eq('activo', true).order('orden')
      if (mpData) setMetodosPago(mpData)

      // CARGA DE ZONAS Y MESAS
      const { data: zonasData } = await supabase.from('pos_zonas').select('*').eq('tenant_id', subscription.tenantId).order('orden')
      if (zonasData) {
        setZonas(zonasData)
        if (!currentZonaId && zonasData.length > 0) setCurrentZonaId(zonasData[0].id)
      }

      const { data: mesasData } = await supabase.from('mesas').select('*').eq('tenant_id', subscription.tenantId).order('numero')
      if (mesasData) {
        const { data: activeOrders } = await supabase.from('pos_orders').select('*, zytek_users!waiter_id(nombre), pos_order_items(*)').eq('tenant_id', subscription.tenantId).in('status', ['pending', 'draft'])

        const hydratedTables = mesasData.map((m: any) => {
          const order = activeOrders?.find(o => o.mesa === m.id || o.mesa === m.numero.toString())
          return {
            id: m.id,
            numero: m.numero,
            nombre: m.nombre,
            zona_id: m.zona_id,
            grid_x: m.grid_x || 1,
            grid_y: m.grid_y || 1,
            grid_page: m.grid_page || 1,
            capacidad: m.capacidad,
            estado: order ? (order.status === 'paid' ? 'libre' : 'ocupada') : (m.estado || 'libre'),
            pedido: order?.pos_order_items?.map((it: any) => ({
              id: it.menu_item_id,
              uid: it.id,
              nombre: it.nombre,
              precio: parseFloat(it.precio_unitario),
              cantidad: it.cantidad,
              enviado: it.status !== 'ordered'
            })) || [],
            mesero: (order as any)?.zytek_users?.nombre || '—',
            monto: order?.total,
            opened: order?.ts_abierta ? new Date(order.ts_abierta) : undefined,
            id_db: order?.id
          }
        })
        setTables(hydratedTables)
      }
    } catch (e) {
      console.error("Error loading POS data", e)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock({
        date: now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      })
      setTick(t => t + 1)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [])

  // PIN lockout countdown
  useEffect(() => {
    if (!pinBlockedUntil) { setPinCountdown(0); return }
    const tick = () => {
      const remaining = Math.ceil((pinBlockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setPinBlockedUntil(null)
        setPinCountdown(0)
        setPinFailedCount(0)
        setAuthError('')
      } else {
        setPinCountdown(remaining)
      }
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [pinBlockedUntil])

  // Mesas persistence handled in loadPOSData

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'libre': return { bg: 'transparent', border: colors.border, text: colors.textDim }
      case 'ocupada': return { bg: colors.blueDim, border: colors.blueB, text: colors.blue }
      case 'cuenta': return { bg: colors.orangeDim, border: colors.orangeB, text: colors.orange }
      case 'reservada': return { bg: colors.purpleDim, border: colors.purpleB, text: colors.purple }
      case 'deuda': return { bg: colors.redDim, border: colors.redB, text: colors.red }
    }
  }

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'libre': return 'LIBRE'
      case 'ocupada': return 'OCUPADA'
      case 'cuenta': return 'PAGAR'
      case 'reservada': return 'RESERVADA'
      case 'deuda': return 'CRÉDITO'
    }
  }

  const colors = {
    bg: theme === 'dark' ? '#0d0d0f' : '#f4f4f8',
    surface: theme === 'dark' ? '#16161a' : '#fff',
    surface2: theme === 'dark' ? '#1e1e24' : '#f0f0f5',
    topbar: theme === 'dark' ? '#111114' : '#fff',
    border: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    border2: theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)',
    text: theme === 'dark' ? '#f0f0f5' : '#111118',
    textMid: theme === 'dark' ? '#b0b0c0' : '#444455',
    textDim: theme === 'dark' ? '#606070' : '#888899',
    orange: '#ff7c20',
    orangeDim: 'rgba(255,124,32,0.12)',
    orangeB: 'rgba(255,124,32,0.3)',
    green: '#2ee87a',
    greenDim: 'rgba(46,232,122,0.1)',
    greenB: 'rgba(46,232,122,0.25)',
    blue: '#38b6ff',
    blueDim: 'rgba(56,182,255,0.1)',
    blueB: 'rgba(56,182,255,0.25)',
    purple: '#a855f7',
    purpleDim: 'rgba(168,85,247,0.1)',
    purpleB: 'rgba(168,85,247,0.25)',
    red: '#ff4757',
    redDim: 'rgba(255,71,87,0.12)',
    redB: 'rgba(255,71,87,0.25)',
    cyan: '#00d4ff',
    amber: '#ffc040',
  }

  const filteredTables = (tables || []).filter(t => t.zona_id === currentZonaId)
  const activeTables = (tables || []).filter(t => t.estado !== 'libre').length
  
  const filteredItems = currentCat
    ? items.filter(i => {
        if (!i.activo || i.agotado) return false
        
        // Buscamos la categoría actual para entender su configuración
        const cat = categories.find(c => c.id === currentCat || c.nombre === currentCat)
        
        // Soporte dual para filtrado por categoría (ID o Nombre)
        const matchesCat = i.categoria_id === cat?.id || i.cat === cat?.nombre || i.categoria_id === currentCat || i.cat === currentCat
        if (!matchesCat) return false
        
        // Si hay un subgrupo seleccionado (ej: Tamaño Grande), filtramos por él
        if (currentSubgrupo) return i.subgroup_id === currentSubgrupo.id
        
        // Si la categoría TIENE subgrupos pero no hemos seleccionado uno, no mostramos ítems aún 
        // (el usuario debe elegir el tamaño primero)
        if (cat?.has_subgroups || cat?.hasSubgroups) return false
        
        // Si no tiene subgrupos, mostramos todo lo que pertenezca a la categoría
        return true
      })
    : items.filter(i => i.activo && !i.agotado)

  const subgruposCurrent = subGrupos.filter(sg => sg.categoria_id === currentCat)
  const hasAnyMods = (p: MenuItem): boolean =>
    !!(p.forced_modifiers?.enabled && p.forced_modifiers.modifierIds?.length) ||
    (p.extras_modifier_ids?.length ?? 0) > 0 ||
    (p.sin_modifier_ids?.length ?? 0) > 0

  const currentOrder = selectedTable?.pedido || []
  const orderTotal = currentOrder.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  const ejecutarCambioMesa = (origenId: string, destinoId: string) => {
    const origen = tables.find(t => t.id === origenId)
    const destino = tables.find(t => t.id === destinoId)
    if (!origen || !destino || destino.estado !== 'libre') return
    setTables(prev => prev.map(t => {
      if (t.id === origenId) return { ...t, estado: 'libre' as TableStatus, pedido: undefined, monto: undefined, opened: undefined, cliente: undefined }
      if (t.id === destinoId) return { ...t, estado: origen.estado, pedido: origen.pedido, monto: origen.monto, opened: origen.opened, cliente: origen.cliente }
      return t
    }))
  }

  const ejecutarFusionMesas = (mesaA: string, mesaB: string) => {
    const a = tables.find(t => t.id === mesaA)
    const b = tables.find(t => t.id === mesaB)
    if (!a || !b) return
    const pedidoCombinado = [...(a.pedido || []), ...(b.pedido || [])]
    const montoCombinado = (a.monto || 0) + (b.monto || 0)
    setTables(prev => prev.map(t => {
      if (t.id === mesaA) return { ...t, pedido: pedidoCombinado, monto: montoCombinado, estado: 'ocupada' as TableStatus, opened: a.opened || b.opened || new Date() }
      if (t.id === mesaB) return { ...t, estado: 'libre' as TableStatus, pedido: undefined, monto: undefined, opened: undefined, cliente: undefined }
      return t
    }))
  }

  const handleTableClick = (table: Table) => {
    if (opMode) {
      const next = [...opSelecciones, table.id]
      if (opMode === 'cambio') {
        if (opSelecciones.length === 0) {
          if (table.estado === 'libre') return
          setOpSelecciones(next)
        } else {
          if (table.estado !== 'libre') return
          ejecutarCambioMesa(opSelecciones[0], table.id)
          setOpMode(null); setOpSelecciones([])
        }
      } else if (opMode === 'fusionar') {
        if (opSelecciones.length === 0) {
          if (table.estado === 'libre') return
          setOpSelecciones(next)
        } else {
          if (table.estado === 'libre' || table.id === opSelecciones[0]) return
          ejecutarFusionMesas(opSelecciones[0], table.id)
          setOpMode(null); setOpSelecciones([])
        }
      }
      return
    }
    if (table.estado === 'libre') {
      // Siempre pedir PIN para identificar quién abre la mesa
      setAuthCallback(() => () => {
        const authUser = lastAuthUserRef.current
        const orderId = crypto.randomUUID()
        const tsAbierta = new Date()
        const meseroNombre = authUser?.nombre || '—'
        const meseroId = authUser?.id
        const openedTable: Table = {
          ...table,
          id_db: orderId,
          estado: 'ocupada' as TableStatus,
          pedido: [],
          opened: tsAbierta,
          mesero: meseroNombre,
        }

        // Sincronizar apertura de mesa + asignar mesero
        import('@/lib/idb.client').then(({ idbPut, enqueueSync }) => {
          const orderData = {
            id: orderId,
            tenant_id: subscription.tenantId,
            mesa: table.nombre || table.numero.toString(),
            status: 'draft',
            waiter_id: meseroId,
            ts_abierta: tsAbierta.toISOString()
          }
          idbPut('pos_orders', orderData)
          enqueueSync('pos', 'pos_orders', 'upsert', orderData)

          // Persistir mesero en la tabla mesas
          supabase.from('mesas').update({ mesero: meseroNombre, estado: 'ocupada' }).eq('id', table.id).then(() => {})
        })

        // Audit trail
        import('@/services/audit-service').then(({ AuditService }) => {
          AuditService.recordAction({
            tenantId: subscription.tenantId,
            userId: meseroId,
            action: 'OPEN_TABLE',
            entityType: 'order',
            entityId: orderId,
            dataAfter: { mesa_numero: table.numero, mesero: meseroNombre },
          })
        })

        const updated = tables.map(t => t.id === table.id ? openedTable : t)
        setTables(updated)
        setSelectedTable(openedTable)
        setCurrentView('comanda')
      })
      setAuthMinNivel(5)
      setAuthActionLabel('abrirMesa')
      setAuthError('')
      setPin('')
      setShowAuthOverlay(true)
      return
    }
    setSelectedTable(table)
    setCurrentView('comanda')
  }

  const selectCat = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    setCurrentCat(catId)
    setCurrentSubgrupo(null)
    if (cat?.has_subgroups) {
      setMenuStep('subgrupo')
    } else {
      setMenuStep('prods')
    }
  }

  const selectSubgrupo = (subgrupo: Subgrupo) => {
    setCurrentSubgrupo(subgrupo)
    setMenuStep('prods')
  }

  const selectProduct = (product: MenuItem) => {
    setSelectedProduct(product)
    setModsForced([])
    setModsOptional([])
    setNote('')

    if (hasAnyMods(product)) {
      setMenuStep('mods')
    } else {
      finalizeAdd(product, [], [], '')
    }
  }

  const toggleModForced = (mod: MenuModifier) => {
    const cfg = selectedProduct?.forcedModifiers
    const max = cfg?.maxSelections ?? 0
    setModsForced(prev => {
      const exists = prev.find(m => m.id === mod.id)
      if (exists) return prev.filter(m => m.id !== mod.id)
      if (max > 0 && prev.length >= max) return prev
      return [...prev, mod]
    })
  }

  const toggleModOptional = (mod: MenuModifier) => {
    setModsOptional(prev => {
      const exists = prev.find(m => m.id === mod.id)
      if (exists) return prev.filter(m => m.id !== mod.id)
      return [...prev, mod]
    })
  }

  const proceedFromMods = () => {
    if (selectedProduct) {
      finalizeAdd(selectedProduct, modsForced, modsOptional, note)
    }
  }

  const addToOrder = (item: MenuItem) => {
    selectProduct(item)
  }

  const finalizeAdd = (
    product: MenuItem,
    forced: MenuModifier[],
    optional: MenuModifier[],
    noteText: string,
  ) => {
    if (!selectedTable) return

    const basePrice = product.precio
    const extraCost = [...forced, ...optional].reduce((s, m) => s + m.precio, 0)
    const totalPrice = basePrice + extraCost

    const sg = subGrupos.find(x => x.id === product.subgroup_id) || null
    let itemName = product.nombre
    if (sg) itemName += ` · ${sg.nombre}`

    const newItem: OrderItem = {
      id: Date.now().toString(),
      uid: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      nombre: itemName,
      precio: totalPrice,
      cantidad: 1,
      modsForced: [...forced],
      modsOptional: [...optional],
      variante: sg?.nombre || undefined,
      nota: noteText || undefined,
      enviado: false,
      menu_item_id: product.id,
    }

    const updatedTable = { ...selectedTable, pedido: [...(selectedTable.pedido || []), newItem] }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)

    setTables(updatedTables)
    setSelectedTable(updatedTable)

    // Sincronizar ítem individual de inmediato
    import('@/lib/idb.client').then(({ idbPut, enqueueSync }) => {
      const dbOrderId = (selectedTable as any).id_db || (selectedTable as any).db_order_id
      if (dbOrderId) {
        const itemData = {
          id: newItem.uid,
          order_id: dbOrderId,
          menu_item_id: product.id,
          nombre: itemName,
          precio_unitario: totalPrice,
          cantidad: 1,
          subtotal: totalPrice,
          modificadores: [...forced, ...optional],
          status: 'ordered',
          created_at: new Date().toISOString()
        }
        idbPut('pos_order_items', itemData)
        enqueueSync('pos', 'pos_order_items', 'upsert', itemData)
      }
    })

    setMenuStep('cats')
    setCurrentCat(null)
    setSelectedProduct(null)
    setModsForced([])
    setModsOptional([])
    setNote('')
  }

  const handlePinSubmit = async (manualPin?: any) => {
    // Si viene de un evento de React (numpad), ignoramos el parámetro
    const pinToValidate = typeof manualPin === 'string' ? manualPin : pin

    if (!pinToValidate) return

    // Check lockout
    if (pinBlockedUntil && Date.now() < pinBlockedUntil) {
      setAuthError(`Bloqueado — espera ${pinCountdown}s`)
      setPin('')
      return
    }

    setLoading(true)
    setAuthError('')

    try {
      console.log(`🔑 Validando PIN: ${pinToValidate.substring(0,2)}**`)
      const { data: dbUsers, error } = await supabase
        .from('zytek_users')
        .select('*')
        .eq('activo', true)

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }

      console.log(`👥 Usuarios encontrados en DB: ${dbUsers?.length || 0}`)

      let authenticatedUser = null
      for (const u of dbUsers || []) {
        const isMatch = await bcrypt.compare(pinToValidate, u.pin_hash)
        if (isMatch) {
          console.log(`✅ Acceso concedido: ${u.nombre}`)
          authenticatedUser = u
          break
        }
      }

      if (authenticatedUser) {
        setPinFailedCount(0)
        setPinBlockedUntil(null)
        // Reset failed_attempts in DB
        supabase.from('zytek_users').update({ failed_attempts: 0, blocked_until: null }).eq('id', authenticatedUser.id).then(() => {})
        setPin('')
        // Si por alguna razón no se activó al marcar los dígitos, intentamos aquí también
        if (!document.fullscreenElement) {
          toggleFullScreen();
        }

        if (authenticatedUser.nivel === 6) {
          if (typeof window !== 'undefined') window.open('/kds', '_blank')
          return
        }
        setCurrentUser(authenticatedUser)
        if (authenticatedUser.nivel <= 2) setCurrentView('destino')
        else setCurrentView('mesas')
      } else {
        const newCount = pinFailedCount + 1
        setPinFailedCount(newCount)
        if (newCount >= 3) {
          const blockUntil = Date.now() + 30000
          setPinBlockedUntil(blockUntil)
          setAuthError(`3 intentos fallidos — bloqueado 30 segundos`)
        } else {
          const hasUsers = dbUsers && dbUsers.length > 0
          setAuthError(hasUsers ? `PIN Incorrecto (${newCount}/3)` : 'Error: No hay usuarios activos en la DB')
        }
        setPin('')
      }
    } catch (err) {
      console.error('Auth error:', err)
      setAuthError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const requireAuth = (action: AuthAction, callback: () => void) => {
    const minNivel = AUTH_NIVEL_MIN[action]
    if (currentUser && currentUser.nivel <= minNivel) {
      callback()
      return
    }
    setAuthCallback(() => callback)
    setAuthMinNivel(minNivel)
    setAuthActionLabel(action)
    setAuthError('')
    setPin('')
    setShowAuthOverlay(true)
  }

  const handleAuthAction = (callback: () => void) => requireAuth('anularOrden', callback)

  const confirmAuth = async () => {
    if (!pin) return

    // Check lockout
    if (pinBlockedUntil && Date.now() < pinBlockedUntil) {
      setAuthError(`Bloqueado — espera ${pinCountdown}s`)
      setPin('')
      return
    }

    setLoading(true)
    setAuthError('')

    try {
      const { data: dbUsers, error } = await supabase
        .from('zytek_users')
        .select('*')
        .eq('activo', true)

      if (error) throw error

      let authenticatedUser = null
      for (const u of dbUsers || []) {
        const match = await bcrypt.compare(pin, u.pin_hash)
        if (match) {
          authenticatedUser = u
          break
        }
      }

      if (authenticatedUser && authenticatedUser.nivel <= authMinNivel) {
        setPinFailedCount(0)
        setPinBlockedUntil(null)
        lastAuthUserRef.current = authenticatedUser
        // Para abrirMesa: el mesero que metió PIN pasa a ser el usuario activo
        if (authActionLabel === 'abrirMesa') setCurrentUser(authenticatedUser)
        if (authCallback) authCallback()
        setShowAuthOverlay(false)
        setPin('')
        setAuthCallback(null)
        setAuthError('')
      } else {
        const newCount = pinFailedCount + 1
        setPinFailedCount(newCount)
        if (newCount >= 3) {
          const blockUntil = Date.now() + 30000
          setPinBlockedUntil(blockUntil)
          setAuthError(`3 intentos fallidos — bloqueado 30 segundos`)
        } else {
          setAuthError(authenticatedUser ? `Nivel insuficiente (requiere ≤ ${authMinNivel})` : `PIN inválido (${newCount}/3)`)
        }
        setPin('')
      }
    } catch (err) {
      console.error('Supervisor Auth error:', err)
      setAuthError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const renderSuccessOverlay = () => {
    if (!showSuccess) return null
    return (
      <div style={{ position: 'fixed', inset: 0, zTarget: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, zIndex: 1000 }}>
        <div style={{ fontSize: 80, animation: 'zkPop 0.4s ease' }}>✅</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: colors.green, marginBottom: 8 }}>Venta Procesada</div>
          <div style={{ fontSize: 12, color: colors.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 2 }}>NÚMERO DE ORDEN / RETIRO</div>
        </div>
        <div style={{ background: colors.surface2, border: `2px solid ${colors.orange}`, borderRadius: 20, padding: '24px 60px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 72, fontWeight: 900, color: colors.orange, lineHeight: 1 }}>{lastOrderNumber}</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, fontFamily: 'DM Mono, monospace' }}>
          Total: ${lastTotal.toFixed(2)}
        </div>
        <button 
          onClick={() => { setShowSuccess(false); setCurrentView('mesas') }}
          style={{ padding: '14px 40px', borderRadius: 12, border: 'none', background: colors.green, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 20 }}
        >
          NUEVA VENTA / VOLVER
        </button>
      </div>
    )
  }
  const renderQuickClientModal = () => {
    if (!showQuickClientModal) return null
    const close = () => setShowQuickClientModal(false)
    const idLabel = (paisCfg as any).pais === 've' ? 'RIF / Cédula' : (paisCfg as any).pais === 'mx' ? 'RFC' : (paisCfg as any).pais === 'co' ? 'NIT / CC' : 'ID Fiscal'

    return (
      <ModalShell
        title="👤 Datos del Cliente"
        sub="Venta Directa · Registro Rápido"
        onClose={close}
        maxWidth={460}
        footer={
          <div style={{ display: 'flex', width: '100%', gap: 10 }}>
            <button
              onClick={() => handleConfirmQuickClient(true)}
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Saltar (Consumidor Final)
            </button>
            <button
              onClick={() => handleConfirmQuickClient(false)}
              disabled={!quickClientData.nombre}
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: quickClientData.nombre ? colors.green : colors.surface2, color: quickClientData.nombre ? '#000' : colors.textDim, fontSize: 13, fontWeight: 700, cursor: quickClientData.nombre ? 'pointer' : 'not-allowed' }}
            >
              🚀 Continuar
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.orange, letterSpacing: 1 }}>{idLabel.toUpperCase()}</label>
              <input
                type="text"
                autoFocus
                placeholder="Ej. V-26123456"
                value={quickClientData.idFiscal}
                onChange={(e) => handleIdFiscalChange(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 14, outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>WHATSAPP</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ padding: '10px 8px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, color: colors.textDim }}>+{(paisCfg as any).whatsappCode || ''}</div>
                <input
                  type="tel"
                  placeholder="Número"
                  value={quickClientData.whatsapp}
                  onChange={(e) => setQuickClientData(p => ({ ...p, whatsapp: e.target.value }))}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>NOMBRE Y APELLIDO (O RAZÓN SOCIAL)</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={quickClientData.nombre}
              onChange={(e) => setQuickClientData(p => ({ ...p, nombre: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>DIRECCIÓN (OPCIONAL PARA DELIVERY)</label>
            <textarea
              placeholder="Ej. Av. Principal, Edf. Horizonte, Apto 4B"
              value={quickClientData.direccion}
              onChange={(e) => setQuickClientData(p => ({ ...p, direccion: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', resize: 'none', height: 60 }}
            />
          </div>
        </div>
      </ModalShell>
    )
  }

  const repetirUltimoItem = () => {
    if (!selectedTable?.pedido?.length) return
    const last = selectedTable.pedido[selectedTable.pedido.length - 1]
    const clone: OrderItem = {
      ...last,
      id: Date.now().toString(),
      uid: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      enviado: false,
      cantidad: 1,
    }
    const updatedTable = { ...selectedTable, pedido: [...selectedTable.pedido, clone] }
    setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t))
    setSelectedTable(updatedTable)
  }

  const anularOrden = () => {
    if (!selectedTable) return
    const updatedTable = { ...selectedTable, pedido: [], estado: 'libre' as TableStatus, opened: undefined, id_db: undefined }
    setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t))
    setSelectedTable(null)

    // Sincronizar anulación/liberación
    import('@/lib/idb.client').then(({ enqueueSync }) => {
      const dbOrderId = (selectedTable as any).id_db || (selectedTable as any).db_order_id
      if (dbOrderId) {
        // Marcamos como cancelada o eliminamos
        enqueueSync('pos', 'pos_orders', 'upsert', { id: dbOrderId, status: 'cancelled' })
      }
    })
  }

  const enviarCocinaOSalir = () => {
    if (selectedTable?.pedido?.some(i => !i.enviado)) {
      sendToKitchen()
    }
    setCurrentView('mesas')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.tagName === 'BUTTON' && t.getAttribute('tabindex') === '-1') {
        try { (t as HTMLButtonElement).blur() } catch {}
      }
      const tag = t?.tagName
      const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      const anyModal = showCobrar || showCorteX || showCorteZ || showFuncionesMesa ||
        showCliente || showDividir || showNotaConsumo || showFunciones ||
        showDescuento || showCuentas || showEditPin || showCortezConfirm ||
        showTasaModal || !!pagoPopup || !!editCuenta

      if (showAuthOverlay) {
        if (e.key === 'Escape') { e.preventDefault(); setShowAuthOverlay(false); setPin(''); setAuthCallback(null); setAuthError(''); return }
        if (isField) return
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault()
          setPin(p => {
            if (p.length >= 8) return p
            const next = p + e.key
            // El auto-matching se deshabilitó para favorecer validación asíncrona por DB.
            return next
          })
          return
        }
        if (e.key === 'Backspace') { e.preventDefault(); setPin(p => p.slice(0, -1)); return }
        if (e.key === 'Enter') { e.preventDefault(); confirmAuth(); return }
        return
      }

      if (!currentUser) {
        if (isField) return
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault()
          setPin(p => {
            if (p.length >= 8) return p
            const next = p + e.key
            if (next.length === 4) {
              setTimeout(() => handlePinSubmit(next), 0)
            }
            return next
          })
          return
        }
        if (e.key === 'Backspace') { e.preventDefault(); setPin(p => p.slice(0, -1)); return }
        if (e.key === 'Enter') { e.preventDefault(); handlePinSubmit(); return }
        if (e.key === 'Escape') { e.preventDefault(); setPin(''); return }
        return
      }

      if (showCobrar) {
        if (e.key === 'Escape') { e.preventDefault(); setShowCobrar(false); return }
        if (isField) return
        if (e.key === 'Enter') { e.preventDefault(); confirmarCobro(); return }
        const m = /^F(\d{1,2})$/.exec(e.key)
        if (m) {
          const idx = parseInt(m[1], 10) - 1
          const activas = metodosPago
          if (idx >= 0 && idx < activas.length) { e.preventDefault(); seleccionarFormaPago(activas[idx]); return }
        }
        return
      }

      if (anyModal) {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (showTasaModal) { setShowTasaModal(false); setTasaInput(''); return }
          if (pagoPopup) { setPagoPopup(null); return }
          if (editCuenta) { setEditCuenta(null); return }
          if (showCortezConfirm) { setShowCortezConfirm(false); return }
          if (showEditPin) { setShowEditPin(false); return }
          if (showCuentas) { setShowCuentas(false); return }
          if (showDescuento) { setShowDescuento(false); return }
          if (showFunciones) { setShowFunciones(false); return }
          if (showNotaConsumo) { setShowNotaConsumo(false); return }
          if (showDividir) { setShowDividir(false); return }
          if (showCliente) { setShowCliente(false); return }
          if (showFuncionesMesa) { setShowFuncionesMesa(false); return }
          if (showCorteZ) { setShowCorteZ(false); return }
          if (showCorteX) { setShowCorteX(false); return }
        }
        return
      }

      if (isField) return

      if (currentView === 'mesas') {
        const totalPagLocal = Math.max(1, Math.ceil(filteredTables.length / MESAS_POR_PAGINA))
        if (e.key === 'F3') { e.preventDefault(); setShowFunciones(true); return }
        if (e.key === 'F4') { e.preventDefault(); setClienteSearch(''); setNuevoCli({ nombre: '', tel: '', email: '', notas: '' }); setShowCliente(true); return }
        if (e.key === 'F5') { e.preventDefault(); setShowCorteX(true); return }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMesaPagina(p => Math.min(totalPagLocal - 1, p + 1)); return }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMesaPagina(p => Math.max(0, p - 1)); return }
        if (e.key === 'Escape') { e.preventDefault(); if (window.confirm('¿Cerrar sesión?')) { setSelectedTable(null); setCurrentUser(null) } return }
        return
      }

      if (currentView === 'comanda') {
        if (e.key === 'F1') { e.preventDefault(); setClienteSearch(''); setNuevoCli({ nombre: '', tel: '', email: '', notas: '' }); setShowCliente(true); return }
        if (e.key === 'F2') { e.preventDefault(); if (currentOrder.length) requireAuth('cobrar', () => { setCobroPagos([]); setCobroTipPct(0); setShowCobrar(true) }); return }
        if (e.key === 'F5') { e.preventDefault(); repetirUltimoItem(); return }
        if (e.key === 'F6') { e.preventDefault(); setShowNotaConsumo(true); return }
        if (e.key === 'F7') { e.preventDefault(); requireAuth('anularOrden', anularOrden); return }
        if (e.key === 'Escape') { e.preventDefault(); enviarCocinaOSalir(); return }
        return
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pin, currentUser, currentView, showAuthOverlay, showCobrar, showCorteX, showCorteZ,
    showFuncionesMesa, showCliente, showDividir, showNotaConsumo, showFunciones,
    showDescuento, showCuentas, showEditPin, showCortezConfirm, pagoPopup, editCuenta,
    selectedTable, currentOrder, filteredTables, authCallback, authMinNivel, cobroPagos, cobroTipPct, showTasaModal,
  ])

  const orderTotalBs = orderTotal * tasaBCV

  const renderLoginView = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg }}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '32px 40px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.text, marginBottom: 6 }}>POS Restaurant</div>
        <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 28, fontFamily: 'DM Mono, monospace' }}>Ingresa tu PIN</div>
        
        <div style={{ background: colors.surface2, border: `2px solid ${colors.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, letterSpacing: 8, color: colors.text, minWidth: 140, textAlign: 'center' }}>
            {pin.replace(/./g, '●')}
          </span>
        </div>
        
        {authError && (
          <div style={{ background: colors.redDim, border: `1px solid ${colors.redB}`, borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: colors.red, fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
            {authError}
            {pinCountdown > 0 && (
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: colors.red }}>
                {pinCountdown}s
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20, opacity: (loading || pinCountdown > 0) ? 0.3 : 1, pointerEvents: (loading || pinCountdown > 0) ? 'none' : 'auto' }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => {
                if (!document.fullscreenElement) toggleFullScreen();
                setPin(p => p.length < 4 ? p + n.toString() : p);
              }}
              style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 20, fontWeight: 600, cursor: 'pointer' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.redDim, color: colors.red, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            ✕
          </button>
          <button
            onClick={() => setPin(p => p.length < 4 ? p + '0' : p)}
            style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 20, fontWeight: 600, cursor: 'pointer' }}
          >
            0
          </button>
          <button
            onClick={handlePinSubmit}
            disabled={loading}
            style={{ padding: '16px 0', borderRadius: 10, border: 'none', background: loading ? colors.surface2 : colors.green, color: loading ? colors.textDim : '#000', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? '...' : '✓'}
          </button>
        </div>
        
        <div style={{ fontSize: 10, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
          ZytekOS · POS v2.0
        </div>
      </div>
    </div>
  )

  const renderDestinoView = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg, gap: 24, padding: 40 }}>
      <div
        onClick={() => { setCurrentView('mesas') }}
        style={{ width: 280, height: 320, borderRadius: 20, border: `3px solid ${colors.orange}`, background: colors.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transition: 'all 0.2s' }}
      >
        <div style={{ fontSize: 64 }}>🍽️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: colors.text }}>POS</div>
        <div style={{ fontSize: 12, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>Punto de Venta</div>
      </div>
      <div
        onClick={() => { if (typeof window !== 'undefined') window.location.href = '/admin' }}
        style={{ width: 280, height: 320, borderRadius: 20, border: `3px solid ${colors.blue}`, background: colors.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transition: 'all 0.2s' }}
      >
        <div style={{ fontSize: 64 }}>⚙️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: colors.text }}>Admin</div>
        <div style={{ fontSize: 12, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>Administración</div>
      </div>
    </div>
  )

  const renderAuthOverlay = () => {
    if (!showAuthOverlay) return null
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border2}`, borderRadius: 14, padding: '24px 32px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Autenticación</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 14 }}>
            {authActionLabel ? `${authActionLabel.toUpperCase()} · ` : ''}REQ. NIVEL ≤ {authMinNivel}
          </div>
          <div style={{ background: colors.surface2, border: `2px solid ${colors.orange}`, borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 24, letterSpacing: 8, color: colors.text, textAlign: 'center', outline: 'none', fontFamily: 'DM Mono, monospace' }}
            />
          </div>
          {authError && (
            <div style={{ fontSize: 11, color: colors.red, marginBottom: 12, fontFamily: 'DM Mono, monospace' }}>{authError}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAuthOverlay(false); setPin(''); setAuthError('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmAuth} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: colors.green, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirmar</button>
          </div>
        </div>
      </div>
    )
  }

  const renderTasaModal = () => {
    if (!showTasaModal) return null
    const nueva = parseFloat(tasaInput) || 0
    const confirmar = () => {
      if (nueva <= 0) return
      setTasaBCV(nueva)
      writeTasaLocal(nueva)
      setShowTasaModal(false)
      setTasaInput('')
    }
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) { setShowTasaModal(false); setTasaInput('') } }}
        style={{ position: 'fixed', inset: 0, zIndex: 650, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ background: colors.surface, border: `2px solid ${colors.cyan}`, borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💱</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Actualizar {paisCfg.tasaLabel}</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 14 }}>
            {paisCfg.nombre} · 1 USD → {paisCfg.simbolo}
          </div>
          <div style={{ fontSize: 10, color: colors.textDim, marginBottom: 6 }}>Actual: <span style={{ color: colors.cyan, fontFamily: 'DM Mono, monospace' }}>{tasaBCV.toFixed(2)}</span></div>
          <input
            type="number"
            step="0.01"
            autoFocus
            value={tasaInput}
            onChange={(e) => setTasaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `2px solid ${colors.border2}`, background: colors.surface2, color: colors.text, fontSize: 22, fontFamily: 'DM Mono, monospace', textAlign: 'center', marginBottom: 14, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowTasaModal(false); setTasaInput('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmar} disabled={nueva <= 0} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: nueva > 0 ? colors.green : colors.surface2, color: nueva > 0 ? '#000' : colors.textDim, fontSize: 12, fontWeight: 600, cursor: nueva > 0 ? 'pointer' : 'not-allowed' }}>Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  const updateItemQty = (itemUid: string, delta: number) => {
    if (!selectedTable) return
    const item = selectedTable.pedido?.find(i => i.uid === itemUid)
    if (!item) return

    // REGLA ANTIFRAUDE: Si el ítem ya fue enviado a cocina y se quiere reducir/eliminar, 
    // requiere PIN de supervisor + motivo.
    if (delta < 0 && item.enviado) {
      setPendingCancel({ itemUid, delta, motivo: '' })
      setShowCancelReason(true)
      return
    }

    ejecutarUpdateItemQty(itemUid, delta)
  }

  const ejecutarUpdateItemQty = (itemUid: string, delta: number, supervisorId?: string, reason?: string) => {
    if (!selectedTable) return

    const itemBefore = selectedTable.pedido?.find(i => i.uid === itemUid)
    const pedido = selectedTable.pedido?.map(item => {
      if (item.uid === itemUid) {
        const newQty = item.cantidad + delta
        return newQty > 0 ? { ...item, cantidad: newQty } : null
      }
      return item
    }).filter(Boolean) as OrderItem[] | undefined

    const updatedTable = { ...selectedTable, pedido }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
    
    setTables(updatedTables)
    setSelectedTable(updatedTable)

    // AUDITORÍA: Registrar acción si hubo intervención de supervisor
    if (supervisorId) {
      import('@/services/audit-service').then(({ AuditService }) => {
        AuditService.recordAction({
          tenantId: subscription.tenantId,
          userId: currentUser?.id,
          action: delta + itemBefore!.cantidad === 0 ? 'CANCEL_ITEM_POST_SEND' : 'REDUCE_ITEM_POST_SEND',
          entityType: 'item',
          entityId: itemUid,
          dataBefore: itemBefore,
          dataAfter: pedido?.find(i => i.uid === itemUid) || { status: 'cancelled' },
          reason: reason,
          authorizedBy: supervisorId
        })
      })
    }
  }

  const handleConfirmCancelPostSend = () => {
    if (!pendingCancel || !cancelReason) return
    
    requireAuth('anularPlato', () => {
      // El PIN fue validado en confirmAuth, aquí solo ejecutamos
      // Nota: confirmAuth ya limpia el estado de auth.
      ejecutarUpdateItemQty(pendingCancel.itemUid, pendingCancel.delta, 'SUPERVISOR_ID', cancelReason)
      setPendingCancel(null)
      setShowCancelReason(false)
      setCancelReason('')
    })
  }

  const sendToKitchen = async () => {
    if (!selectedTable || !selectedTable.pedido?.some(i => !i.enviado)) return
    
    // 1. Asegurar un UUID válido para la orden. Si la mesa ya tiene uno lo usamos, si no lo creamos.
    const orderId = (selectedTable as any).db_order_id || crypto.randomUUID()
    const itemsToDeliver = selectedTable.pedido.filter(i => !i.enviado)
    
    try {
      const { idbPut, enqueueSync } = await import('@/lib/idb.client')
      
      // 2. Crear o actualizar la cabecera de la orden primero
      const orderData = {
        id: orderId,
        tenant_id: subscription.tenantId,
        mesa: selectedTable.nombre || selectedTable.numero.toString(),
        status: 'pending',
        waiter_id: currentUser?.id,
        ts_abierta: selectedTable.opened ? new Date(selectedTable.opened).toISOString() : new Date().toISOString()
      }

      await idbPut('pos_orders', orderData)
      await enqueueSync('pos', 'pos_orders', 'upsert', orderData)

      // 3. Preparar ítems con mapeo exacto al esquema de DB
      const itemsData = itemsToDeliver.map(i => ({
        id: crypto.randomUUID(), 
        order_id: orderId,
        menu_item_id: i.menu_item_id,
        nombre: i.nombre,
        precio_unitario: i.precio,
        cantidad: i.cantidad,
        subtotal: i.precio * i.cantidad,
        modificadores: [...(i.modsForced || []), ...(i.modsOptional || [])],
        status: 'ordered',
        created_at: new Date().toISOString()
      }))

      // Guardado local e intento de sync para cada ítem
      for (const it of itemsData) {
        await idbPut('pos_order_items', it)
        await enqueueSync('pos', 'pos_order_items', 'upsert', it)
      }

      // 4. Actualizar estado local
      const updatedTable = { 
        ...selectedTable, 
        db_order_id: orderId, // Persistimos el ID de DB en el estado local
        pedido: selectedTable.pedido.map(i => i.enviado ? i : { ...i, enviado: true, sent_at: new Date() }) 
      }
      const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
      
      setTables(updatedTables)
      setSelectedTable(updatedTable)

      // Registrar acción en auditoría
      import('@/services/audit-service').then(({ AuditService }) => {
        AuditService.recordAction({
          tenantId: subscription.tenantId,
          userId: currentUser?.id,
          action: 'SEND_TO_KITCHEN',
          entityType: 'order',
          entityId: orderId,
          dataAfter: { items_count: itemsData.length }
        })
      })

    } catch (err) {
      console.error('Error enviando a cocina:', err)
      alert('Error crítico al procesar la comanda.')
    }
  }

  const resendItem = async (itemUid: string) => {
    if (!selectedTable) return
    const item = selectedTable.pedido?.find(i => i.uid === itemUid)
    if (!item) return

    // Auditoría
    import('@/services/audit-service').then(({ AuditService }) => {
      AuditService.recordAction({
        tenantId: subscription.tenantId,
        userId: currentUser?.id,
        action: 'RESEND_KITCHEN',
        entityType: 'item',
        entityId: item.uid,
        reason: 'Reenvío solicitado por mesero'
      })
    })

    // Simular reenvío resaltado
    console.log(`📠 REENVIANDO A COCINA: ${item.nombre}`)
    setItemOpTarget(null)
  }

  const reprintItem = (itemUid: string) => {
    console.log(`🖨️ REIMPRIMIENDO TICKET: ${itemUid}`)
    setItemOpTarget(null)
  }

  const sendItemMsg = (itemUid: string, msg: string) => {
    if (!msg.trim()) return
    console.log(`💬 MENSAJE A COCINA [${itemUid}]: ${msg}`)
    setItemOpTarget(null)
    setItemMsgInput('')
  }

  const resendFullComanda = () => {
    if (!selectedTable?.pedido?.length) return
    console.log(`📠 REENVIANDO COMANDA COMPLETA: Mesa ${selectedTable.numero}`)
    
    // Auditoría
    import('@/services/audit-service').then(({ AuditService }) => {
      AuditService.recordAction({
        tenantId: subscription.tenantId,
        userId: currentUser?.id,
        action: 'RESEND_FULL_COMANDA',
        entityType: 'order',
        entityId: selectedTable.id,
        reason: 'Reenvío manual de comanda completa'
      })
    })

    // Mostrar un toast rápido o feedback visual
    alert('Comanda reenviada a cocina')
  }

  const processPayment = async () => {
    if (!selectedTable) return
    
    // Generar número de orden (correlativo corto para retiro)
    const orderNum = (Date.now() % 1000).toString().padStart(3, '0')
    const finalTotal = orderTotal + (orderTotal * 0.1) // Simulación IVA

    try {
      let cliente_id: string | null = null

      // UPSERT Cliente si es registro rápido
      if (selectedTable.cliente && typeof selectedTable.cliente === 'object' && selectedTable.cliente.id.startsWith('new_')) {
        const c = selectedTable.cliente as any
        const { data: newClient, error: clientErr } = await supabase
          .from('clientes')
          .upsert({
            tenant_id: subscription.tenantId,
            nombre: c.nombre,
            tel: c.tel,
            id_fiscal: c.id_fiscal,
            direccion: c.direccion,
          }, { onConflict: 'id_fiscal' })
          .select('id')
          .single()
        
        if (!clientErr && newClient) {
          cliente_id = newClient.id
        } else {
          console.error('Error upserting client:', clientErr)
        }
      } else if (selectedTable.cliente && typeof selectedTable.cliente === 'object') {
        cliente_id = selectedTable.cliente.id
      }

      const { error } = await supabase.from('ventas').insert({
        id: crypto.randomUUID(),
        tenant_id: subscription.tenantId,
        mesa: selectedTable.nombre || selectedTable.numero.toString(),
        cliente_id, // Link al cliente
        total: finalTotal,
        items: selectedTable.pedido?.map(i => ({
          itemId: i.id,
          nombre: i.nombre,
          precio: i.precio,
          cantidad: i.cantidad,
          subtotal: i.precio * i.cantidad,
        })) || [],
        cajero: currentUser?.nombre || 'Demo',
        created_at: new Date().toISOString(),
        tipo: 'venta',
        ts: Date.now()
      })

      if (error) throw error

      setLastOrderNumber(orderNum)
      setLastTotal(finalTotal)
      setShowSuccess(true)
      
      // Liberar mesa
      const updatedTable = { ...selectedTable, estado: 'libre' as TableStatus, pedido: [], monto: undefined }
      const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
      setTables(updatedTables)
      setSelectedTable(null)
      setShowCobrar(false)
    } catch (e) {
      console.error('Error procesando pago:', e)
      alert('Error al guardar la venta en la base de datos.')
    }
  }

  const renderMesasView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 148px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ background: colors.topbar, borderRight: `2px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '12px 14px 6px', borderBottom: `1px solid ${colors.border}` }}>
          AMBIENTES
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {zonas.map(zona => (
            <div
              key={zona.id}
              className={currentZonaId === zona.id ? 'zk-amb-active' : ''}
              onClick={() => { setCurrentZonaId(zona.id); setMesaPagina(0) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: 10, borderRadius: 8,
                cursor: 'pointer', border: '1px solid transparent', marginBottom: 3,
                background: currentZonaId === zona.id ? colors.greenDim : 'transparent',
                borderColor: currentZonaId === zona.id ? colors.greenB : 'transparent',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 4, background: colors.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {zona.image_url ? <img src={zona.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} /> : '🗺️'}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: currentZonaId === zona.id ? colors.green : colors.text }}>
                  {zona.nombre}
                </div>
                <div style={{ fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
                  {tables.filter(t => t.zona_id === zona.id).length} mesas
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { color: colors.border2, label: 'Libre' },
            { color: colors.blue, label: 'Ocupada' },
            { color: colors.orange, label: 'Cuenta' },
            { color: colors.purple, label: 'Reservada' },
            { color: colors.red, label: 'Crédito' },
          ].map(ley => (
            <div key={ley.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ley.color }} />
              {ley.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bg, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.surface, flexShrink: 0 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text }}>
            {zonas.find(z => z.id === currentZonaId)?.nombre || 'Seleccione Zona'}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: colors.text }}>
                {tables.filter(t => t.zona_id === currentZonaId && t.estado !== 'libre').length}
              </span>
              <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>ocupadas</span>
            </div>
          </div>
        </div>
        {opMode && (() => {
          const def = opMode === 'cambio'
            ? { label: 'CAMBIO DE MESA', steps: ['ORIGEN', 'DESTINO'], colors: [colors.amber, colors.green], sep: '→' }
            : { label: 'FUSIONAR MESAS', steps: ['MESA A', 'MESA B'], colors: [colors.blue, colors.purple], sep: '+' }
          const hint = opSelecciones.length === 0
            ? `TOCA LA MESA — ${def.steps[0]}`
            : `TOCA LA MESA — ${def.steps[1]}`
          return (
            <div style={{ padding: '10px 16px', borderBottom: `2px solid ${colors.border}`, flexShrink: 0, background: colors.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6, color: opSelecciones.length === 0 ? def.colors[0] : def.colors[1] }}>
                    {def.label} · {hint}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {def.steps.map((step, i) => {
                      const val = opSelecciones[i]
                      const done = i < opSelecciones.length
                      const active = i === opSelecciones.length
                      const bc = done ? colors.greenB : active ? def.colors[i] : colors.border
                      const bg = done ? colors.greenDim : active ? 'rgba(255,255,255,0.05)' : colors.surface2
                      const tc = done ? colors.green : active ? def.colors[i] : colors.textDim
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, padding: '6px 14px', borderRadius: 6, border: `2px solid ${bc}`, background: bg, textAlign: 'center', minWidth: 100 }}>
                            <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>{step}</div>
                            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 900, color: tc }}>{val ? `M${tables.find(t => t.id === val)?.numero ?? '—'}` : '—'}</div>
                          </div>
                          {i < def.steps.length - 1 && (
                            <div style={{ fontSize: 16, color: colors.textDim }}>{def.sep}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <button
                  onClick={() => { setOpMode(null); setOpSelecciones([]) }}
                  style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >✕ Cancelar</button>
              </div>
            </div>
          )
        })()}
        <div
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gridTemplateRows: 'repeat(5, 1fr)',
            gap: 12, 
            padding: 20, 
            overflow: 'hidden', 
            flex: 1, 
            height: '100%',
            width: '100%',
            background: zonas.find(z => z.id === currentZonaId)?.image_url ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${zonas.find(z => z.id === currentZonaId).image_url}) center/cover no-repeat` : colors.bg,
            borderRadius: 16,
            position: 'relative'
          }}
          onTouchStart={(e) => { swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
          onTouchEnd={(e) => {
            if (!swipeRef.current) return
            const dx = e.changedTouches[0].clientX - swipeRef.current.x
            const dy = e.changedTouches[0].clientY - swipeRef.current.y
            swipeRef.current = null
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
            const totalPag = Math.max(1, Math.ceil(filteredTables.length / MESAS_POR_PAGINA))
            if (dx < 0) setMesaPagina(p => Math.min(totalPag - 1, p + 1))
            else setMesaPagina(p => Math.max(0, p - 1))
          }}
        >
          {(() => {
            const currentPage = mesaPagina + 1
            const pageTables = tables.filter(t => t.zona_id === currentZonaId && t.grid_page === currentPage)
            
            // Renderizamos los 25 slots de la grilla 5x5
            const cells = []
            for (let y = 1; y <= 5; y++) {
              for (let x = 1; x <= 5; x++) {
                const table = pageTables.find(t => t.grid_x === x && t.grid_y === y)
                if (table) {
                  const statusStyle = getStatusColor(table.estado)
                  const elapsed = formatElapsed(table.opened)
                  const isOcupada = table.estado !== 'libre'
                  cells.push(
                    <div
                      key={table.id}
                      className="zk-mesa"
                      onClick={() => handleTableClick(table)}
                      style={{
                        gridColumn: x,
                        gridRow: y,
                        position: 'relative',
                        borderRadius: 12, padding: '10px 8px', cursor: 'pointer',
                        border: isOcupada ? `2px solid ${statusStyle.border}` : `0.5px solid rgba(255,255,255,0.06)`,
                        textAlign: 'center',
                        background: statusStyle.bg, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isOcupada ? `0 8px 20px ${statusStyle.border}33` : 'none',
                        opacity: 1,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {elapsed && (() => {
                        const elapsedColor = getElapsedColor(table.opened)
                        return (
                          <span style={{
                            position: 'absolute', top: 5, left: 5,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontFamily: 'DM Mono, monospace', color: elapsedColor,
                            background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 6,
                          }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: elapsedColor, flexShrink: 0 }} />
                            {elapsed}
                          </span>
                        )
                      })()}
                      {table.subcuentas && table.subcuentas.length > 1 && (
                        <div
                          title={`${table.subcuentas.length} cuentas separadas`}
                          style={{
                            position: 'absolute', top: 5, right: 5,
                            background: 'rgba(175,169,236,0.15)', border: '1px solid rgba(175,169,236,0.4)',
                            color: '#AFA9EC', borderRadius: 5, padding: '1px 5px',
                            fontSize: 9, fontWeight: 700, fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          ⎇ {table.subcuentas.length}
                        </div>
                      )}
                      <div style={{
                        fontFamily: 'Fraunces, serif', fontSize: 42, fontWeight: 900, lineHeight: 1, marginBottom: 4,
                        color: 'rgba(255,255,255,0.95)',
                      }}>
                        {table.numero}
                      </div>
                      <div style={{
                        fontSize: 10, fontFamily: 'DM Mono, monospace',
                        letterSpacing: '0.15em', fontWeight: 700,
                        color: statusStyle.text,
                      }}>
                        {getStatusLabel(table.estado).toUpperCase()}
                      </div>
                      {isOcupada && (() => {
                        const items = table.pedido || []
                        const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
                        const count = items.reduce((s, i) => s + i.cantidad, 0)
                        return (
                          <>
                            {table.mesero && (
                              <span
                                title={table.mesero}
                                style={{
                                  position: 'absolute', bottom: 6, left: 8,
                                  fontSize: 11, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
                                  color: getAvatarColor(table.mesero),
                                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                              >
                                {table.mesero}
                              </span>
                            )}
                            <div style={{ position: 'absolute', bottom: 4, right: 8, textAlign: 'right' }}>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                                ${total.toFixed(2)}
                              </div>
                              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                                {count} ítem{count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )
                } else {
                  // Celda vacía (el "Grill" táctil)
                  cells.push(
                    <div 
                      key={`empty-${x}-${y}`} 
                      style={{ gridColumn: x, gridRow: y, border: `1px dashed ${colors.border}`, borderRadius: 12, opacity: 0.15 }} 
                    />
                  )
                }
              }
            }
            return cells
          })()}
        </div>
        {(() => {
          const zoneTables = tables.filter(t => t.zona_id === currentZonaId)
          const maxPage = Math.max(1, Math.max(...zoneTables.map(t => t.grid_page || 1)))
          if (maxPage <= 1) return null
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '10px', background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
              <button 
                onClick={() => setMesaPagina(p => Math.max(0, p - 1))}
                disabled={mesaPagina === 0}
                style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, opacity: mesaPagina === 0 ? 0.3 : 1, cursor: 'pointer' }}
              >◀ Anterior</button>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>PÁGINA {mesaPagina + 1} DE {maxPage}</span>
              <button 
                onClick={() => setMesaPagina(p => Math.min(maxPage - 1, p + 1))}
                disabled={mesaPagina >= maxPage - 1}
                style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, opacity: mesaPagina >= maxPage - 1 ? 0.3 : 1, cursor: 'pointer' }}
              >Siguiente ▶</button>
            </div>
          )
        })()}
        {filteredTables.length > MESAS_POR_PAGINA && (() => {
          const totalPag = Math.ceil(filteredTables.length / MESAS_POR_PAGINA)
          const safePag = Math.min(mesaPagina, totalPag - 1)
          const start = safePag * MESAS_POR_PAGINA
          const end = Math.min(start + MESAS_POR_PAGINA, filteredTables.length)
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 14px', borderTop: `1px solid ${colors.border}`, background: colors.surface, flexShrink: 0 }}>
              <button
                onClick={() => setMesaPagina(p => Math.max(0, p - 1))}
                disabled={safePag === 0}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, cursor: safePag === 0 ? 'not-allowed' : 'pointer', fontSize: 11, opacity: safePag === 0 ? 0.4 : 1 }}
              >◀</button>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {Array.from({ length: totalPag }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setMesaPagina(i)}
                    style={{
                      width: i === safePag ? 20 : 8, height: 8,
                      borderRadius: i === safePag ? 4 : '50%',
                      background: i === safePag ? colors.orange : colors.border2,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setMesaPagina(p => Math.min(totalPag - 1, p + 1))}
                disabled={safePag >= totalPag - 1}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, cursor: safePag >= totalPag - 1 ? 'not-allowed' : 'pointer', fontSize: 11, opacity: safePag >= totalPag - 1 ? 0.4 : 1 }}
              >▶</button>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginLeft: 4 }}>
                {start + 1}-{end} / {filteredTables.length}
              </span>
            </div>
          )
        })()}
      </div>

      {renderActionsCol()}
    </div>
  )

  const RKEY_BG: Record<string, string> = {
    blue:   'linear-gradient(180deg,#1e4a8c 0%,#163a74 100%)',
    amber:  'linear-gradient(180deg,#b87a00 0%,#8a5a00 100%)',
    green:  'linear-gradient(180deg,#1a6e3a 0%,#115a2a 100%)',
    red:    'linear-gradient(180deg,#d41428 0%,#aa0e20 100%)',
    orange: 'linear-gradient(180deg,#cc5500 0%,#aa4000 100%)',
    purple: 'linear-gradient(180deg,#5b21b6 0%,#4c1d95 100%)',
  }

  const renderRKey = (
    label: string,
    icon: string,
    num: string,
    onClick: () => void,
    color: keyof typeof RKEY_BG = 'blue',
    bgChar?: string,
  ) => (
    <div
      key={`${num}-${label}`}
      className="zk-rkey"
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', height: 72, minHeight: 60,
        background: RKEY_BG[color],
        borderBottom: '1px solid rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderRight: '1px solid rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, lineHeight: 1, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none', userSelect: 'none' }}>
        {bgChar ?? num}
      </div>
      <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', lineHeight: 1, zIndex: 1 }}>
        F{num}
      </div>
      <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1, position: 'relative', top: -3, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>{icon}</span>
      <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px', zIndex: 1 }}>
        {label}
      </span>
    </div>
  )

  const renderActionsCol = () => {
    const nivel = currentUser?.nivel ?? 6
    const items: Array<{ kind: 'key' | 'sep' | 'spacer', node?: React.ReactNode }> = []
    let n = 1

    if (nivel <= 5) {
      items.push({ kind: 'key', node: renderRKey('Venta Directa', '🧾', String(n++), iniciarVentaDirecta, 'green') })
      items.push({ kind: 'key', node: renderRKey('Cobrar Mesa', '💳', String(n++), () => { setCobroPagos([]); setCobroTipPct(0); setPagoPopup(null); setShowCobrar(true) }, 'orange') })
      items.push({ kind: 'key', node: renderRKey('Funciones Mesas', '⚡', String(n++), () => setShowFunciones(true), 'blue') })
      items.push({ kind: 'key', node: renderRKey('Asignar Cliente', '👤', String(n++), () => setShowCliente(true), 'blue') })
      items.push({ kind: 'sep' })
    }
    if (nivel <= 4) {
      items.push({ kind: 'key', node: renderRKey('Corte X', '📊', String(n++), () => {
        setCortexBilletesUSD({}); setCortexBilletesBs({}); setCortexSueltoUSD(0); setCortexSueltoBs(0)
        setCortexFondo(0); setCortexObs(''); setCortexFpagoContado({})
        setShowCorteX(true)
      }, 'amber') })
    }
    if (nivel <= 3) {
      items.push({ kind: 'key', node: renderRKey('Corte Z', '🔒', String(n++), () => {
        setCortezEgresos([]); setCortezObs(''); setCortezConfirmInput(''); setShowCorteZ(true)
      }, 'red') })
    }
    if (nivel <= 2) {
      items.push({ kind: 'sep' })
      items.push({ kind: 'key', node: renderRKey('Admin', '⚙️', String(n++), () => { if (typeof window !== 'undefined') window.location.href = '/admin' }, 'purple') })
    }
    items.push({ kind: 'spacer' })

    return (
      <div style={{ background: '#0f1923', borderLeft: '2px solid rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, width: 148 }}>
        {items.map((it, i) => {
          if (it.kind === 'sep') return <div key={`sep-${i}`} style={{ height: 4, background: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />
          if (it.kind === 'spacer') return <div key={`sp-${i}`} style={{ flex: 1 }} />
          return it.node
        })}
        <div
          onClick={() => { setSelectedTable(null); setCurrentUser(null) }}
          style={{
            position: 'relative', overflow: 'hidden', flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', height: 72,
            background: RKEY_BG.red,
            borderBottom: '1px solid rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, lineHeight: 1, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>✕</div>
          <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 14, color: '#fff', zIndex: 1 }}>ESC</div>
          <span style={{ fontSize: 22, zIndex: 1, position: 'relative', top: -3 }}>✕</span>
          <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
            Cerrar Sesión
          </span>
        </div>
      </div>
    )
  }

  const renderComandaView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.surface }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>MESA:</span>
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const t = tables.find(tbl => tbl.id === e.target.value)
                if (t) setSelectedTable(t)
              }}
              style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '7px 10px', color: colors.text, fontSize: 12, outline: 'none' }}
            >
              <option value="">— seleccionar —</option>
              {tables.filter(t => t.estado !== 'libre').map(t => (
                <option key={t.id} value={t.id}>Mesa {t.numero}</option>
              ))}
            </select>
            {selectedTable && selectedTable.estado !== 'libre' && (
              <button
                onClick={() => requireAuth('anularOrden', anularOrden)}
                style={{ background: colors.redDim, border: `1px solid ${colors.redB}`, color: colors.red, borderRadius: 6, padding: '6px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                🗑️ ANULAR
              </button>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {selectedTable?.pedido?.some(i => i.enviado) && (
              <button
                onClick={resendFullComanda}
                title="Reenviar toda la comanda a cocina"
                style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.orange, borderRadius: 6, padding: '4px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                📠 REENVIAR TODO
              </button>
            )}
            {menuStep !== 'cats' && (
              <button
                onClick={() => {
                  if (menuStep === 'mods') setMenuStep('prods')
                  else if (menuStep === 'prods') {
                    const cat = categories.find(c => c.id === currentCat)
                    if (cat?.hasSubgroups) setMenuStep('subgrupo')
                    else setMenuStep('cats')
                  }
                  else setMenuStep('cats')
                }}
                style={{ background: 'transparent', border: 'none', color: colors.textMid, fontSize: 12, cursor: 'pointer' }}
              >
                ← Atrás
              </button>
            )}
          </div>
        </div>

        {menuStep === 'cats' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              CATEGORÍAS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => selectCat(cat.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    padding: 10, borderRadius: 12, cursor: 'pointer', 
                    background: cat.image_url ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url(${cat.image_url}) center/cover no-repeat` : colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 110,
                    transition: 'all 0.13s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  {!cat.image_url && <span style={{ fontSize: 26, lineHeight: 1 }}>{cat.emoji}</span>}
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{cat.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'subgrupo' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              {categories.find(c => c.id === currentCat)?.nombre} — ELIGE UN TAMAÑO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {subgruposCurrent.map(sg => (
                <div
                  key={sg.id}
                  onClick={() => selectSubgrupo(sg)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: 12, borderRadius: 12, cursor: 'pointer', background: colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 100,
                    transition: 'all 0.13s',
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{sg.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{sg.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'prods' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim }}>
                {categories.find(c => c.id === currentCat)?.nombre}
                {currentSubgrupo ? ` — ${currentSubgrupo.nombre}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {loading && <div style={{ color: colors.textDim, textAlign: 'center', gridColumn: '1/-1', padding: 40 }}>Cargando...</div>}
              {!loading && filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
                    padding: 10, borderRadius: 10, cursor: 'pointer', 
                    background: item.image_url ? `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.85)), url(${item.image_url}) center/cover no-repeat` : colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 100,
                    transition: 'all 0.13s',
                    opacity: item.agotado ? 0.4 : 1,
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  {!item.image_url && <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji || '🍽️'}</span>}
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1.1, textShadow: '0 2px 4px rgba(0,0,0,0.8)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.nombre}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.orange, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    ${item.precio.toFixed(2)}
                  </span>
                  {item.agotado && (
                    <span style={{ fontSize: 8, color: colors.red, fontFamily: 'DM Mono, monospace' }}>AGOTADO</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'mods' && selectedProduct && (() => {
          const p = selectedProduct
          const fcfg = p.forced_modifiers
          const forcedList = fcfg?.enabled ? MODS(fcfg.modifierIds) : []
          const extrasList = MODS(p.extras_modifier_ids || [])
          const sinList = MODS(p.sin_modifier_ids || [])
          const max = fcfg?.maxSelections ?? 0
          const modCard = (mod: MenuModifier, isSelected: boolean, onToggle: () => void, flavor: 'forced' | 'extra' | 'sin') => (
            <div
              key={mod.id}
              onClick={onToggle}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: 8, borderRadius: 9, cursor: 'pointer',
                background: isSelected ? (flavor === 'sin' ? colors.redDim : colors.greenDim) : colors.surface2,
                border: `2px solid ${isSelected ? (flavor === 'sin' ? colors.redB : colors.greenB) : colors.border}`,
                textAlign: 'center', height: 80, transition: 'all 0.13s',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{mod.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{mod.nombre}</span>
              {mod.precio > 0 && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.amber }}>+${mod.precio.toFixed(2)}</span>
              )}
            </div>
          )
          const sectionHeader = (title: string, sub?: string, color = colors.textDim) => (
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color, padding: '8px 14px 4px 14px', flexShrink: 0 }}>
              {title} {sub && <span style={{ color: colors.textDim, fontWeight: 400 }}>{sub}</span>}
            </div>
          )
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
                {p.nombre} — MODIFICADORES
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {forcedList.length > 0 && (
                  <>
                    {sectionHeader(
                      fcfg?.label || 'Contornos',
                      max > 0 ? `— elige hasta ${max} (${modsForced.length}/${max})` : '— elige los que quieras',
                      colors.amber,
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 10px 10px 10px' }}>
                      {forcedList.map(mod => modCard(
                        mod,
                        modsForced.some(m => m.id === mod.id),
                        () => toggleModForced(mod),
                        'forced',
                      ))}
                    </div>
                  </>
                )}
                {extrasList.length > 0 && (
                  <>
                    {sectionHeader('Extras', '— opcional')}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 10px 10px 10px' }}>
                      {extrasList.map(mod => modCard(
                        mod,
                        modsOptional.some(m => m.id === mod.id),
                        () => toggleModOptional(mod),
                        'extra',
                      ))}
                    </div>
                  </>
                )}
                {sinList.length > 0 && (
                  <>
                    {sectionHeader('Sin…', '— opcional')}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 10px 10px 10px' }}>
                      {sinList.map(mod => modCard(
                        mod,
                        modsOptional.some(m => m.id === mod.id),
                        () => toggleModOptional(mod),
                        'sin',
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="📝 Nota para cocina (opcional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 7, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                />
                <button
                  onClick={proceedFromMods}
                  style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.green, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ✅ Agregar · ${(p.precio + [...modsForced, ...modsOptional].reduce((s, m) => s + m.precio, 0)).toFixed(2)}
                </button>
              </div>
            </div>
          )
        })()}

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bg, borderLeft: `1px solid ${colors.border}` }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: colors.surface }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: colors.text }}>
              Pedido {selectedTable ? `· Mesa ${selectedTable.numero}` : ''}
            </div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginTop: 2 }}>
              {currentOrder.length} ÍTEMS
            </div>
          </div>
          {selectedTable?.opened && (
            <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: getElapsedColor(selectedTable.opened), fontWeight: 700 }}>
              ⏱ {formatElapsed(selectedTable.opened) || '—'}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {currentOrder.length === 0 ? (
            <div style={{ color: colors.textDim, textAlign: 'center', padding: 30, fontSize: 12 }}>
              Sin ítems.<br />Selecciona un plato para agregarlo.
            </div>
          ) : currentOrder.map(item => (
            <div key={item.uid} style={{ position: 'relative', background: colors.surface2, borderRadius: 10, padding: 10, border: `1px solid ${item.enviado ? colors.border : colors.orangeB}`, marginBottom: 6, opacity: item.enviado ? 0.75 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: colors.orange }}>{item.cantidad}x</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{item.nombre}</div>
                    {item.modificadores && item.modificadores.length > 0 && <div style={{ fontSize: 9, color: colors.orange, fontFamily: 'DM Mono, monospace' }}>{item.modificadores.map(m => m.nombre).join(', ')}</div>}
                    {item.nota && <div style={{ fontSize: 9, color: colors.textDim, fontStyle: 'italic', marginTop: 2 }}>"{item.nota}"</div>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: colors.text }}>${(item.precio * item.cantidad).toFixed(2)}</div>
                  {item.enviado ? (
                    <div 
                      onClick={() => setItemOpTarget(item.uid)}
                      style={{ fontSize: 8, color: colors.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 4, cursor: 'pointer' }}
                    >
                      ENVIADO {itemOpTarget === item.uid ? '▼' : '⚙️'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        onClick={() => updateItemQty(item.uid, -1)}
                        style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >–</button>
                      <button
                        onClick={() => updateItemQty(item.uid, 1)}
                        style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >+</button>
                    </div>
                  )}
                </div>
              </div>

              {itemOpTarget === item.uid && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dotted ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button onClick={() => reprintItem(item.uid)} style={{ padding: '6px', fontSize: 9, borderRadius: 5, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, cursor: 'pointer' }}>🖨️ Reimprimir</button>
                    <button onClick={() => resendItem(item.uid)} style={{ padding: '6px', fontSize: 9, borderRadius: 5, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, cursor: 'pointer' }}>📠 Reenviar</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input 
                      placeholder="Msg a cocina..."
                      value={itemMsgInput}
                      onChange={(e) => setItemMsgInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', fontSize: 10, borderRadius: 5, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, outline: 'none' }}
                    />
                    <button onClick={() => sendItemMsg(item.uid, itemMsgInput)} style={{ padding: '0 10px', borderRadius: 5, border: 'none', background: colors.blue, color: '#fff', fontSize: 10, cursor: 'pointer' }}>OK</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['¡Urgente!', 'Prioridad', 'Para llevar'].map(m => (
                        <span 
                          key={m} 
                          onClick={() => sendItemMsg(item.uid, m)}
                          style={{ fontSize: 8, padding: '2px 6px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', color: colors.textDim }}
                        >
                          {m}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 14px', borderTop: `1px solid ${colors.border}`, background: colors.surface, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: colors.textDim }}>SUBTOTAL</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: colors.textMid }}>${orderTotal.toFixed(2)}</span>
            </div>
            {posSettings?.impuestos_activos && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: colors.textDim }}>IVA ({(posSettings?.iva_porcentaje || 0)}%)</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: colors.textMid }}>${(orderTotal * (posSettings?.iva_porcentaje || 0) / 100).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, paddingTop: 4, borderTop: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.orange, fontWeight: 700 }}>TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 900, color: colors.orange }}>${(orderTotal * (1 + (posSettings?.impuestos_activos ? (posSettings?.iva_porcentaje || 0) / 100 : 0))).toFixed(2)}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.textDim }}>Bs {(orderTotal * (1 + (posSettings?.impuestos_activos ? (posSettings?.iva_porcentaje || 0) / 100 : 0)) * tasaBCV).toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={sendToKitchen}
              disabled={!currentOrder.some(i => !i.enviado)}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 7, border: 'none', background: currentOrder.some(i => !i.enviado) ? colors.amber : colors.surface2, color: currentOrder.some(i => !i.enviado) ? '#000' : colors.textDim, fontSize: 11, fontWeight: 700, cursor: currentOrder.some(i => !i.enviado) ? 'pointer' : 'not-allowed' }}
            >
              👨‍🍳 Enviar
            </button>
            <button
              onClick={() => { setCobroPagos([]); setCobroTipPct(0); setShowCobrar(true) }}
              disabled={!currentOrder.length}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 7, border: 'none', background: currentOrder.length ? colors.green : colors.surface2, color: currentOrder.length ? '#000' : colors.textDim, fontSize: 11, fontWeight: 700, cursor: currentOrder.length ? 'pointer' : 'not-allowed' }}
            >
              💳 Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const seleccionarFormaPago = (forma: MetodoPago) => {
    setSelectedPayment(forma.id)
    if (forma.identificador === 'credito') {
      setShowCobrar(false)
      return
    }
    setPagoPopup({ fpagoId: forma.id, esBs: forma.moneda === 'bs' })
    const sub = currentOrder.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const tax = sub * 0.10
    const tip = sub * (cobroTipPct / 100)
    const totalUSD = sub + tax + tip
    const pagado = cobroPagos.reduce((s, p) => s + p.montoUSD, 0)
    const pendUSD = Math.max(0, totalUSD - pagado)
    const valor = forma.moneda === 'bs' ? (pendUSD * tasaBCV).toFixed(2) : pendUSD.toFixed(2)
    setPagoInput(valor)
  }

  const aceptarPagoPopup = () => {
    if (!pagoPopup) return
    const recibido = parseFloat(pagoInput) || 0
    if (recibido <= 0) return
    const forma = metodosPago.find(f => f.id === pagoPopup.fpagoId)
    if (!forma) return
    const montoUSD = pagoPopup.esBs ? recibido / tasaBCV : recibido
    const sym = pagoPopup.esBs ? 'Bs' : '$'
    const display = pagoPopup.esBs
      ? `${sym} ${recibido.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`
      : `${sym} ${recibido.toFixed(2)}`
    setCobroPagos(prev => [...prev, {
      formaId: forma.id, nombre: forma.label, emoji: forma.emoji, montoUSD, montoDisplay: display,
    }])
    setPagoPopup(null)
    setPagoInput('')
  }

  const eliminarPago = (idx: number) => setCobroPagos(prev => prev.filter((_, i) => i !== idx))

  const confirmarCobro = async () => {
    if (!cobroPagos.length || !selectedTable) return
    
    // 1. Cálculos Finales
    const subtotal = selectedTable.pedido?.reduce((s, i) => s + i.precio * i.cantidad, 0) || 0
    const impuestos = subtotal * 0.10 // Según config, por ahora 10% demo
    const propinas = subtotal * (cobroTipPct / 100)
    const totalUSD = subtotal + impuestos + propinas
    const pagadoUSD = cobroPagos.reduce((s, p) => s + p.montoUSD, 0)
    
    if (totalUSD - pagadoUSD > 0.005) {
      alert('El monto pagado no cubre el total de la cuenta.')
      return
    }

    const orderId = self.crypto.randomUUID()
    
    // 2. Preparar Datos para Supabase / IndexedDB Sync (Siguiendo 010_advanced_pos.sql)
    const orderData = {
      id: orderId,
      tenant_id: subscription.tenantId,
      session_id: currentSession?.id || null, // Nulo si no hay sesión activa (evita error UUID)
      waiter_id: currentUser?.id,
      mesa: selectedTable?.id || 'Mesa 0',
      status: 'paid', // Valor válido del enum pos_order_status
      subtotal,
      impuestos,
      propinas,
      total: totalUSD,
      ts_abierta: selectedTable.opened ? new Date(selectedTable.opened).toISOString() : new Date().toISOString(),
      ts_cerrada: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const itemsData = (selectedTable.pedido || []).map(i => ({
      id: self.crypto.randomUUID(),
      order_id: orderId,
      menu_item_id: i.id,
      nombre: i.nombre,
      precio_unitario: i.precio,
      cantidad: i.cantidad,
      subtotal: i.precio * i.cantidad,
      modificadores: i.modificadores || [],
      status: 'delivered', // Valor válido del enum pos_item_status
      created_at: new Date().toISOString()
    }))

    const paymentsData = cobroPagos.map(p => ({
      id: self.crypto.randomUUID(),
      order_id: orderId,
      metodo: p.nombre, 
      monto_usd: p.montoUSD,
      monto_local: p.montoUSD * tasaBCV,
      tasa_cambio: tasaBCV,
      created_at: new Date().toISOString()
    }))

    try {
      // 3. Guardado Offline-First con SyncQueue
      const { enqueueSync, idbPut } = await import('@/lib/idb.client')
      
      // Upsert local para respuesta instantánea
      await idbPut('pos_orders', orderData)
      for (const it of itemsData) await idbPut('pos_order_items', it)
      
      // Encolar para sincronización real con Supabase
      await enqueueSync('pos', 'pos_orders', 'upsert', orderData)
      for (const it of itemsData) await enqueueSync('pos', 'pos_order_items', 'upsert', it)
      for (const py of paymentsData) await enqueueSync('pos', 'pos_payments', 'upsert', py)
      
      // 4. Liberar mesa y limpiar estado
      setTables(prev => prev.map(t => t.id === selectedTable.id
        ? { ...t, estado: 'libre' as TableStatus, pedido: undefined, monto: undefined, opened: undefined, cliente: undefined }
        : t))
        
      setShowCobrar(false)
      setCobroPagos([])
      setCobroTipPct(0)
      setSelectedTable(null)
      setCurrentView('mesas')
      setShowSuccess(true)
      setLastOrderNumber(orderId.slice(-4).toUpperCase())
      setLastTotal(totalUSD)

    } catch (err) {
      console.error('Error procesando cobro avanzado:', err)
      alert('Error al procesar la transacción.')
    }
  }

  const renderCancelReasonModal = () => {
    if (!showCancelReason || !pendingCancel) return null
    const item = selectedTable?.pedido?.find(i => i.uid === pendingCancel.itemUid)
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: colors.surface, border: `2px solid ${colors.red}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Anulación de Ítem</div>
          <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 16 }}>
            Confirmar anulación de: <br/>
            <strong style={{ color: colors.text }}>{item?.nombre}</strong>
          </div>
          
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
             <label style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>Motivo de la Anulación</label>
             <textarea 
               value={cancelReason}
               onChange={(e) => setCancelReason(e.target.value)}
               placeholder="Explica por qué se anula este plato..."
               style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', resize: 'none', height: 80, marginTop: 4 }}
             />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={() => { setShowCancelReason(false); setPendingCancel(null); setCancelReason('') }}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >Cancelar</button>
            <button 
              onClick={handleConfirmCancelPostSend}
              disabled={!cancelReason.trim()}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: cancelReason.trim() ? colors.red : colors.surface2, color: cancelReason.trim() ? '#fff' : colors.textDim, fontSize: 13, fontWeight: 700, cursor: cancelReason.trim() ? 'pointer' : 'not-allowed' }}
            >Siguiente (PIN) →</button>
          </div>
        </div>
      </div>
    )
  }

  const renderPagoPopup = () => {
    if (!pagoPopup) return null
    const forma = metodosPago.find(f => f.id === pagoPopup.fpagoId)
    if (!forma) return null
    const sub = currentOrder.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const totalUSD = sub * 1.10 + sub * (cobroTipPct / 100)
    const pagado = cobroPagos.reduce((s, p) => s + p.montoUSD, 0)
    const pendUSD = Math.max(0, totalUSD - pagado)
    const pendBs = pendUSD * tasaBCV
    const sym = pagoPopup.esBs ? 'Bs' : '$'
    const totalStr = pagoPopup.esBs
      ? pendBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })
      : `${pendUSD.toFixed(2)}`
    const recibido = parseFloat(pagoInput) || 0
    const totalRef = pagoPopup.esBs ? pendBs : pendUSD
    const vuelto = recibido - totalRef
    let vueltoText: { color: string; text: string } | null = null
    if (recibido > 0) {
      if (vuelto >= 0) {
        vueltoText = { color: colors.green, text: `Vuelto: ${sym} ${pagoPopup.esBs ? vuelto.toLocaleString('es-VE', { maximumFractionDigits: 2 }) : vuelto.toFixed(2)}` }
      } else {
        vueltoText = { color: colors.amber, text: `Pago parcial — quedan ${sym} ${Math.abs(vuelto).toFixed(2)}` }
      }
    }
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setPagoPopup(null) }}
        style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ background: colors.surface, border: `2px solid ${colors.orangeB}`, borderRadius: 16, padding: '24px 28px', minWidth: 320, maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{forma.emoji} {forma.label}</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 14 }}>MONTO RECIBIDO</div>
          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginBottom: 4 }}>
            PENDIENTE <span style={{ color: colors.orange }}>{totalStr}</span>
          </div>
          <input
            type="number"
            step="0.01"
            value={pagoInput}
            onChange={(e) => setPagoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); aceptarPagoPopup() }
              if (e.key === 'Escape') { e.preventDefault(); setPagoPopup(null) }
            }}
            autoFocus
            style={{ width: '100%', fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 900, color: colors.text, background: colors.surface2, border: `2px solid ${colors.orange}`, borderRadius: 10, padding: '12px 16px', textAlign: 'right', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, minHeight: 20, marginBottom: 16, color: vueltoText?.color || 'transparent' }}>
            {vueltoText?.text || '·'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setPagoPopup(null)}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${colors.redB}`, background: colors.redDim, color: colors.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >✕ Cancelar</button>
            <button
              onClick={aceptarPagoPopup}
              style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', background: colors.orange, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >✅ Aceptar</button>
          </div>
        </div>
      </div>
    )
  }

  const renderCobrarModal = () => {
    if (!showCobrar) return null
    const sub = currentOrder.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const tax = sub * 0.10
    const tip = sub * (cobroTipPct / 100)
    const totalUSD = sub + tax + tip
    const totalBs = totalUSD * tasaBCV
    const pagado = cobroPagos.reduce((s, p) => s + p.montoUSD, 0)
    const pendUSD = Math.max(0, totalUSD - pagado)
    const vueltoUSD = Math.max(0, pagado - totalUSD)
    const puedeConfirmar = cobroPagos.length > 0 && pendUSD < 0.005
    const mesaLabel = selectedTable ? `Mesa ${selectedTable.numero}` : 'Sin mesa'
    const metodoActivo = cobroPagos.length === 0 ? 'Sin forma de pago seleccionada' : `${cobroPagos.length} pago${cobroPagos.length !== 1 ? 's' : ''} registrado${cobroPagos.length !== 1 ? 's' : ''}`

    return (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: colors.bg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${colors.border}`, background: colors.topbar, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: colors.text }}>💳 Cobro — {mesaLabel}</div>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginTop: 2 }}>{metodoActivo}</div>
            </div>
            <button
              onClick={() => setShowCobrar(false)}
              style={{ width: 32, height: 32, borderRadius: 6, background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.textMid, cursor: 'pointer', fontSize: 14 }}
            >✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 148px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            <div style={{ display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto', minHeight: 0 }}>

              <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', background: colors.surface, maxHeight: '30vh', overflowY: 'auto', flexShrink: 0 }}>
                {currentOrder.length === 0 ? (
                  <div style={{ color: colors.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'center', padding: 20 }}>Sin productos</div>
                ) : currentOrder.map(item => (
                  <div key={item.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: colors.orange }}>{item.cantidad}×</span>
                      <span style={{ fontSize: 12, color: colors.text }}>{item.nombre}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: colors.text }}>${(item.precio * item.cantidad).toFixed(2)}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.textDim }}>Bs {(item.precio * item.cantidad * tasaBCV).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textDim }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'DM Mono, monospace' }}>${sub.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textDim }}>
                  <span>Impuesto 10%</span>
                  <span style={{ fontFamily: 'DM Mono, monospace' }}>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.green, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Propina
                    <input
                      type="number"
                      value={cobroTipPct}
                      min={0}
                      step={0.5}
                      onChange={(e) => setCobroTipPct(parseFloat(e.target.value) || 0)}
                      style={{ width: 42, background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}`, color: colors.green, fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'right', outline: 'none' }}
                    /> %
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace' }}>${tip.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>TOTAL</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: colors.orange }}>${totalUSD.toFixed(2)}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.textDim }}>Bs {totalBs.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim }}>PAGOS REGISTRADOS</span>
                  {cobroPagos.length > 0 && (
                    <button
                      onClick={() => setCobroPagos([])}
                      style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.red, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                    >✕ Limpiar</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 32 }}>
                  {cobroPagos.length === 0 ? (
                    <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, textAlign: 'center', padding: '8px 0' }}>—</div>
                  ) : cobroPagos.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: colors.text }}>{p.emoji} {p.nombre}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: colors.green }}>{p.montoDisplay}</span>
                        <button
                          onClick={() => eliminarPago(i)}
                          style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', color: colors.textDim, cursor: 'pointer', fontSize: 11 }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <div style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginBottom: 4 }}>PENDIENTE</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.orange }}>${pendUSD.toFixed(2)}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.textDim }}>Bs {(pendUSD * tasaBCV).toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, background: colors.greenDim, border: `1px solid ${colors.greenB}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.green, marginBottom: 4 }}>VUELTO</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.green }}>${vueltoUSD.toFixed(2)}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.green }}>Bs {(vueltoUSD * tasaBCV).toFixed(2)}</div>
                </div>
              </div>

              <button
                onClick={confirmarCobro}
                disabled={!puedeConfirmar}
                style={{
                  width: '100%', padding: 16, fontSize: 15, fontWeight: 700, borderRadius: 8, border: 'none',
                  background: puedeConfirmar ? colors.green : colors.surface2,
                  color: puedeConfirmar ? '#000' : colors.textDim,
                  cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
                }}
              >
                ✅ Confirmar cobro
              </button>
            </div>

            <div style={{ background: '#0f1923', borderLeft: '2px solid rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
              {renderRKey('Corte X', '📊', '6', () => setShowCorteX(true), 'amber')}
              {renderRKey('Corte Z', '🔒', '7', () => setShowCorteZ(true), 'red')}
              <div style={{ flex: 1 }} />
              {renderRKey('Cancelar', '✕', 'ESC', () => setShowCobrar(false), 'red')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metodosPago.length}, 1fr)`, flexShrink: 0, borderTop: '2px solid rgba(0,0,0,0.4)', background: '#0f1923' }}>
            {metodosPago.map((f, i) => {
              const isSelected = selectedPayment === f.id && pagoPopup?.fpagoId === f.id
              return (
                <div
                  key={f.id}
                  onClick={() => seleccionarFormaPago(f)}
                  style={{
                    position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    height: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: RKEY_BG.blue,
                    borderRight: '1px solid rgba(0,0,0,0.3)',
                    outline: isSelected ? '3px solid #fff' : 'none',
                    outlineOffset: -3,
                    filter: isSelected ? 'brightness(1.35)' : 'brightness(1)',
                    transition: 'filter 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}
                >
                  <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, lineHeight: 1, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>{i + 1}</div>
                  <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', zIndex: 1 }}>F{i + 1}</div>
                  <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1, position: 'relative', top: -3, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>{f.emoji}</span>
                  <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px', zIndex: 1 }}>
                    {f.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        {renderPagoPopup()}
      </>
    )
  }


  const FullScreenModal = ({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: colors.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${colors.border}`, background: colors.topbar, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</div>
          {sub && <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginTop: 2 }}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 6, background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.textMid, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  )

  const Card = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, background: colors.surface2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, fontFamily: 'DM Sans, sans-serif' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )

  const renderCorteXModal = () => {
    if (!showCorteX) return null
    const close = () => setShowCorteX(false)
    const totalBilletesUSD = BILLETES_USD.reduce((s, b) => s + b * (cortexBilletesUSD[b] || 0), 0) + cortexSueltoUSD
    const totalBilletesBs = BILLETES_BS.reduce((s, b) => s + b * (cortexBilletesBs[b] || 0), 0) + cortexSueltoBs
    const totalBsEnUsd = totalBilletesBs / tasaBCV
    const totalEfectivoContado = totalBilletesUSD + totalBsEnUsd
    const efectivoSistema = (SISTEMA_FPAGO_DEMO['efectivo-usd'] || 0) + (SISTEMA_FPAGO_DEMO['efectivo-bs'] || 0)
    const efectivoDif = totalEfectivoContado - efectivoSistema

    const formasContadas = Object.entries(SISTEMA_FPAGO_DEMO).filter(([id]) => id !== 'efectivo-usd' && id !== 'efectivo-bs')
    const totalDifFormas = formasContadas.reduce((s, [id, sys]) => s + ((cortexFpagoContado[id] || 0) - sys), 0) + efectivoDif

    const meta = `Cajero: ${currentUser?.nombre || '—'} · Apertura: ${clock.time} · Tasa: ${tasaBCV.toFixed(2)} Bs/$`

    return (
      <FullScreenModal title="📊 Corte X — Cuadre de Turno" sub={meta} onClose={close}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="💵 Conteo de Efectivo">
            <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>BILLETES USD</div>
                {BILLETES_USD.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textDim, minWidth: 32 }}>${b}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={cortexBilletesUSD[b] || ''}
                      onChange={(e) => setCortexBilletesUSD(prev => ({ ...prev, [b]: parseInt(e.target.value) || 0 }))}
                      style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '4px 7px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.green, minWidth: 50, textAlign: 'right' }}>
                      ${(b * (cortexBilletesUSD[b] || 0)).toFixed(0)}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.textDim, minWidth: 60 }}>Suelto $</span>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={cortexSueltoUSD || ''}
                    onChange={(e) => setCortexSueltoUSD(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '4px 7px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                  <span style={{ color: colors.textDim }}>Total USD</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: colors.green }}>${totalBilletesUSD.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>BILLETES Bs</div>
                {BILLETES_BS.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textDim, minWidth: 32 }}>Bs{b}</span>
                    <input
                      type="number" min={0} placeholder="0"
                      value={cortexBilletesBs[b] || ''}
                      onChange={(e) => setCortexBilletesBs(prev => ({ ...prev, [b]: parseInt(e.target.value) || 0 }))}
                      style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '4px 7px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.cyan, minWidth: 60, textAlign: 'right' }}>
                      Bs{(b * (cortexBilletesBs[b] || 0)).toLocaleString('es-VE')}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.textDim, minWidth: 60 }}>Suelto Bs</span>
                  <input
                    type="number" step="1" placeholder="0"
                    value={cortexSueltoBs || ''}
                    onChange={(e) => setCortexSueltoBs(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '4px 7px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                  <span style={{ color: colors.textDim }}>Total Bs ≈ USD</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: colors.cyan }}>${totalBsEnUsd.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title={cortexStep === 'conteo' ? "💳 Conteo por Forma de Pago" : "💳 Resultados de Cuadre"}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.surface2 }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim }}>FORMA DE PAGO</th>
                  {cortexStep === 'resultado' && (
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim }}>SISTEMA ($)</th>
                  )}
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim }}>CONTADO ($)</th>
                  {cortexStep === 'resultado' && (
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim }}>DIFERENCIA</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>💵 Efectivo (USD+Bs)</td>
                  {cortexStep === 'resultado' && (
                    <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.textMid, borderBottom: `1px solid ${colors.border}` }}>${efectivoSistema.toFixed(2)}</td>
                  )}
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.green, borderBottom: `1px solid ${colors.border}` }}>${totalEfectivoContado.toFixed(2)}</td>
                  {cortexStep === 'resultado' && (
                    <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: Math.abs(efectivoDif) < 0.01 ? colors.green : colors.red, borderBottom: `1px solid ${colors.border}` }}>
                      {efectivoDif >= 0 ? '+' : ''}${efectivoDif.toFixed(2)}
                    </td>
                  )}
                </tr>
                {formasContadas.map(([id, sys]) => {
                  const forma = metodosPago.find(f => f.id === id)
                  const contado = cortexFpagoContado[id] || 0
                  const dif = contado - sys
                  return (
                    <tr key={id}>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{forma?.emoji} {forma?.label || id}</td>
                      {cortexStep === 'resultado' && (
                        <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.textMid, borderBottom: `1px solid ${colors.border}` }}>${sys.toFixed(2)}</td>
                      )}
                      <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border}` }}>
                        {cortexStep === 'conteo' ? (
                          <input
                            type="number" step="0.01" placeholder="0.00"
                            value={contado || ''}
                            onChange={(e) => setCortexFpagoContado(prev => ({ ...prev, [id]: parseFloat(e.target.value) || 0 }))}
                            style={{ width: 90, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '4px 7px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, textAlign: 'right', outline: 'none' }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.text }}>${contado.toFixed(2)}</span>
                        )}
                      </td>
                      {cortexStep === 'resultado' && (
                        <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: Math.abs(dif) < 0.01 ? colors.green : colors.red, borderBottom: `1px solid ${colors.border}` }}>
                          {dif >= 0 ? '+' : ''}${dif.toFixed(2)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {cortexStep === 'resultado' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: `2px solid ${colors.border}`, background: colors.surface2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>TOTAL DIFERENCIA REGISTRADA</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: Math.abs(totalDifFormas) < 0.01 ? colors.green : colors.red }}>
                  {totalDifFormas >= 0 ? '+' : ''}${totalDifFormas.toFixed(2)}
                </span>
              </div>
            )}
          </Card>

          <Card title="📋 Movimientos del Turno">
            <div style={{ padding: 14, fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim, textAlign: 'center' }}>
              Sin movimientos registrados en este turno
            </div>
          </Card>
        </div>

        <div style={{ width: 280, flexShrink: 0, background: colors.surface, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 10 }}>RESUMEN DEL TURNO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: colors.textDim }}>Ventas sistema</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: colors.text }}>${Object.values(SISTEMA_FPAGO_DEMO).reduce((s, v) => s + v, 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: colors.textDim }}>Efectivo contado</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: colors.green }}>${totalEfectivoContado.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: colors.textDim }}>Diferencia total</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: Math.abs(totalDifFormas) < 0.01 ? colors.green : colors.amber }}>
                  {totalDifFormas >= 0 ? '+' : ''}${totalDifFormas.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>FONDO PARA SIGUIENTE CAJERO ($)</div>
            <input
              type="number" step="0.01" placeholder="0.00"
              value={cortexFondo || ''}
              onChange={(e) => setCortexFondo(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>OBSERVACIONES</div>
            <textarea
              rows={3} placeholder="Notas del turno..."
              value={cortexObs}
              onChange={(e) => setCortexObs(e.target.value)}
              style={{ width: '100%', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            {cortexStep === 'conteo' ? (
              <button
                onClick={() => {
                  setCortexStep('resultado')
                  // AUDITORÍA: Registrar el cierre con los montos contados vs sistema
                  import('@/services/audit-service').then(({ AuditService }) => {
                    AuditService.recordAction({
                      tenantId: subscription.tenantId,
                      userId: currentUser?.id,
                      action: 'BLIND_CASH_COUNT',
                      entityType: 'session',
                      entityId: currentSession?.id || 'new',
                      dataBefore: { system: SISTEMA_FPAGO_DEMO },
                      dataAfter: { counted: { efectivos: totalEfectivoContado, ...cortexFpagoContado }, gap: totalDifFormas },
                      reason: cortexObs
                    })
                    if (Math.abs(totalDifFormas) > 5) { // Alerta si > $5
                      AuditService.triggerAlert('Gap detectado en Cierre de Caja', `Diferencia total: $${totalDifFormas.toFixed(2)}`, 'high')
                    }
                  })
                }}
                style={{ width: '100%', padding: 14, borderRadius: 7, border: 'none', background: colors.green, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >🚀 Finalizar Conteo y Cuadrar</button>
            ) : (
              <>
                <button
                  onClick={() => window.print()}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >🖨️ Imprimir Reporte X</button>
                <button
                  onClick={close}
                  style={{ width: '100%', padding: 14, borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >✅ Confirmar y Salir</button>
              </>
            )}
            <button
              onClick={close}
              style={{ width: '100%', padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >Cancelar</button>
          </div>
        </div>
      </FullScreenModal>
    )
  }

  const renderCorteZModal = () => {
    if (!showCorteZ) return null
    const close = () => setShowCorteZ(false)
    const totalDiaUSD = Object.values(SISTEMA_FPAGO_DEMO).reduce((s, v) => s + v, 0)
    const totalEgresos = cortezEgresos.reduce((s, e) => s + e.monto, 0)
    const numeroZ = `#Z-${String(cortezNumero).padStart(4, '0')}`
    const fechaCierre = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

    return (
      <FullScreenModal
        title="🔒 Corte Z — Cierre del Día"
        sub={`${numeroZ} · ${fechaCierre} · Tasa ${tasaBCV.toFixed(2)}`}
        onClose={close}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: colors.redDim, border: `1px solid ${colors.redB}`, borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: colors.red, fontSize: 13 }}>Esta operación cierra el día completo</div>
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
                Consolida todos los turnos, genera el reporte Z y reinicia los contadores. No se puede deshacer.
              </div>
            </div>
          </div>

          <Card title="📊 Turnos del Día">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.surface2 }}>
                  {['Turno', 'Cajero', 'Apertura', 'Cierre', 'Ventas ($)', 'Diferencia'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>T1</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{currentUser?.nombre || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textMid, borderBottom: `1px solid ${colors.border}` }}>08:00</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textMid, borderBottom: `1px solid ${colors.border}` }}>{clock.time}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.green, borderBottom: `1px solid ${colors.border}` }}>${totalDiaUSD.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.green, borderBottom: `1px solid ${colors.border}` }}>+$0.00</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card title="💳 Ventas del Día por Forma de Pago">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.surface2 }}>
                  {['Forma de Pago', '# Trans.', 'Total ($)', 'Total Bs'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metodosPago.map((forma) => {
                  const total = 0 // En una fase futura esto vendrá de las ventas reales
                  return (
                    <tr key={forma.id}>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{forma.emoji} {forma.label}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.textMid, borderBottom: `1px solid ${colors.border}` }}>0</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.green, borderBottom: `1px solid ${colors.border}` }}>$0.00</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.cyan, borderBottom: `1px solid ${colors.border}` }}>Bs 0,00</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: `2px solid ${colors.orangeB}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>TOTAL DEL DÍA</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.orange }}>${totalDiaUSD.toFixed(2)}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.textDim }}>Bs {(totalDiaUSD * tasaBCV).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </Card>

          <Card
            title="📤 Egresos del Día"
            action={
              <button
                onClick={() => setCortezEgresos(prev => [...prev, { concepto: '', monto: 0 }])}
                style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >+ Egreso</button>
            }
          >
            {cortezEgresos.length === 0 ? (
              <div style={{ padding: 14, fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim, textAlign: 'center' }}>
                Sin egresos registrados
              </div>
            ) : (
              <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cortezEgresos.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      placeholder="Concepto"
                      value={e.concepto}
                      onChange={(ev) => setCortezEgresos(prev => prev.map((x, j) => j === i ? { ...x, concepto: ev.target.value } : x))}
                      style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '6px 10px', color: colors.text, fontSize: 12, outline: 'none' }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textDim }}>$</span>
                    <input
                      type="number" step="0.01" placeholder="0.00"
                      value={e.monto || ''}
                      onChange={(ev) => setCortezEgresos(prev => prev.map((x, j) => j === i ? { ...x, monto: parseFloat(ev.target.value) || 0 } : x))}
                      style={{ width: 90, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '6px 10px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 12, textAlign: 'right', outline: 'none' }}
                    />
                    <button
                      onClick={() => setCortezEgresos(prev => prev.filter((_, j) => j !== i))}
                      style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'transparent', color: colors.red, cursor: 'pointer', fontSize: 12 }}
                    >✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 11, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>TOTAL EGRESOS</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: colors.red }}>${totalEgresos.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div style={{ width: 280, flexShrink: 0, background: colors.surface, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>NÚMERO DE REPORTE Z</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 900, color: colors.orange }}>{numeroZ}</div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginTop: 2 }}>{fechaCierre} · {clock.time}</div>
          </div>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 10 }}>RESUMEN FINAL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: colors.textDim }}>Total ventas</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: colors.green }}>${totalDiaUSD.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: colors.textDim }}>Egresos</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: colors.red }}>-${totalEgresos.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.text }}>Neto del día</span>
                <span style={{ fontFamily: 'DM Mono, monospace', color: colors.orange }}>${(totalDiaUSD - totalEgresos).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 14, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim, marginBottom: 8 }}>OBSERVACIONES</div>
            <textarea
              rows={3} placeholder="Notas del cierre..."
              value={cortezObs}
              onChange={(e) => setCortezObs(e.target.value)}
              style={{ width: '100%', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            <button
              onClick={() => window.print()}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >🖨️ Imprimir Reporte Z</button>
            <button
              onClick={() => { setCortezConfirmInput(''); setShowCortezConfirm(true) }}
              style={{ width: '100%', padding: 14, borderRadius: 7, border: 'none', background: colors.red, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >🔒 Ejecutar Cierre Z</button>
            <button
              onClick={close}
              style={{ width: '100%', padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >Cancelar</button>
          </div>
        </div>
      </FullScreenModal>
    )
  }

  const renderCortezConfirmModal = () => {
    if (!showCortezConfirm) return null
    const close = () => setShowCortezConfirm(false)
    const valid = cortezConfirmInput.trim().toUpperCase() === 'CERRAR'
    const totalDiaUSD = Object.values(SISTEMA_FPAGO_DEMO).reduce((s, v) => s + v, 0)
    const totalEgresos = cortezEgresos.reduce((s, e) => s + e.monto, 0)
    const numeroZ = `#Z-${String(cortezNumero).padStart(4, '0')}`

    const ejecutar = () => {
      if (!valid) return
      setCortezNumero(prev => prev + 1)
      setTables(prev => prev.map(t => ({ ...t, estado: 'libre' as TableStatus, pedido: undefined, monto: undefined, opened: undefined, cliente: undefined, subcuentas: undefined })))
      close()
      setShowCorteZ(false)
    }

    return (
      <ModalShell
        title="⚠️ Confirmar Cierre Z"
        sub={`${numeroZ} · Total $${totalDiaUSD.toFixed(2)} · Egresos $${totalEgresos.toFixed(2)}`}
        onClose={close}
        maxWidth={460}
        footer={
          <>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button
              onClick={ejecutar}
              disabled={!valid}
              style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: valid ? colors.red : colors.surface2, color: valid ? '#fff' : colors.textDim, fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}
            >🔒 Ejecutar Cierre Z</button>
          </>
        }
      >
        <div style={{ background: colors.redDim, border: `1px solid ${colors.redB}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: colors.red, fontSize: 14, marginBottom: 6 }}>Esta acción no se puede deshacer</div>
          <div style={{ fontSize: 12, color: colors.textMid, lineHeight: 1.6 }}>
            El Corte Z cerrará el día completo, consolidará todos los turnos y reiniciará los contadores desde cero. El reporte quedará guardado en el historial.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {[
            { label: 'Total ventas', value: `$${totalDiaUSD.toFixed(2)}`, color: colors.green },
            { label: 'Egresos', value: `-$${totalEgresos.toFixed(2)}`, color: colors.red },
            { label: 'Neto del día', value: `$${(totalDiaUSD - totalEgresos).toFixed(2)}`, color: colors.orange },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: colors.textDim }}>{r.label}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginBottom: 8, letterSpacing: 1 }}>
            ESCRIBE <span style={{ color: colors.red, fontWeight: 700 }}>CERRAR</span> PARA CONFIRMAR
          </div>
          <input
            type="text"
            placeholder="Escribe CERRAR aquí..."
            value={cortezConfirmInput}
            onChange={(e) => setCortezConfirmInput(e.target.value)}
            autoFocus
            style={{ width: '100%', background: colors.surface, border: `1px solid ${valid ? colors.green : colors.border}`, borderRadius: 6, padding: '10px 12px', color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 14, outline: 'none', letterSpacing: 1, textTransform: 'uppercase', boxSizing: 'border-box' }}
          />
        </div>
      </ModalShell>
    )
  }

  const renderFuncionesMesaModal = () => null

  const renderNotaConsumoModal = () => {
    if (!showNotaConsumo) return null
    const close = () => setShowNotaConsumo(false)
    const items = currentOrder
    const sub = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const tax = sub * 0.10
    const tip = sub * 0.10
    const total = sub + tax
    const now = new Date()
    const fecha = now.toLocaleDateString('es-VE')
    const hora = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    const cliente = typeof selectedTable?.cliente === 'object' ? selectedTable.cliente : null

    return (
      <ModalShell
        title="🖨️ Nota de Consumo"
        sub={`${selectedTable ? `Mesa ${selectedTable.numero}` : '—'} · Pre-cuenta`}
        onClose={close}
        maxWidth={420}
        footer={
          <>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
            <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🖨️ Imprimir</button>
          </>
        }
      >
        <div className="zytek-print-area" style={{ padding: 16, fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.8, background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: `1px dashed ${colors.border}`, paddingBottom: 10 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 900, color: colors.text }}>Mi Restaurante</div>
            <div style={{ fontSize: 10, color: colors.textDim }}>Zytek Cloud ERP</div>
            <div style={{ fontSize: 10, color: colors.textDim }}>{fecha} · {hora}</div>
          </div>
          <div style={{ marginBottom: 8, fontSize: 11 }}>
            <div><strong>Mesa:</strong> {selectedTable?.id || '—'}</div>
            {cliente && <div><strong>Cliente:</strong> {cliente.nombre}{cliente.tel ? ` · ${cliente.tel}` : ''}</div>}
            <div style={{ fontSize: 10, color: colors.textDim }}>TC: {tasaBCV.toFixed(2)} Bs/$</div>
          </div>
          <div style={{ borderTop: `1px dashed ${colors.border}`, borderBottom: `1px dashed ${colors.border}`, padding: '8px 0', marginBottom: 8, fontSize: 11 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textDim, padding: '8px 0' }}>Sin productos</div>
            ) : items.map(item => (
              <div key={item.uid} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{item.cantidad}× {item.nombre}</span>
                <span style={{ fontFamily: 'DM Mono, monospace' }}>${(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span style={{ fontFamily: 'DM Mono, monospace' }}>${sub.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Impuesto 10%</span><span style={{ fontFamily: 'DM Mono, monospace' }}>${tax.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.green }}><span>Propina sug. 10%</span><span style={{ fontFamily: 'DM Mono, monospace' }}>${tip.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, marginTop: 6, paddingTop: 6, fontWeight: 700, fontSize: 14 }}>
              <span>TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: colors.orange }}>${total.toFixed(2)}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.green }}>Bs {(total * tasaBCV).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${colors.border}`, fontSize: 10, color: colors.textDim }}>
            ¡Gracias por su visita!
          </div>
        </div>
      </ModalShell>
    )
  }

  const renderCuentasModal = () => {
    if (!showCuentas) return null
    const close = () => setShowCuentas(false)
    const isEditing = !!editCuenta
    const guardar = () => {
      if (!editCuenta || !editCuenta.banco.trim()) return
      const exists = cuentasBanco.find(c => c.id === editCuenta.id)
      if (exists) {
        setCuentasBanco(prev => prev.map(c => c.id === editCuenta.id ? editCuenta : c))
      } else {
        setCuentasBanco(prev => [...prev, editCuenta])
      }
      setEditCuenta(null)
    }
    const eliminar = (id: string) => {
      if (!confirm('¿Eliminar esta cuenta?')) return
      setCuentasBanco(prev => prev.filter(c => c.id !== id))
    }
    return (
      <ModalShell
        title="🏦 Cuentas Bancarias"
        sub="Datos de depósito mostrados al cobrar"
        onClose={close}
        maxWidth={560}
        footer={
          <>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
            {!isEditing && (
              <button
                onClick={() => setEditCuenta({ id: `cb_${Date.now()}`, banco: '', moneda: 'usd', numero: '', titular: '' })}
                style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >+ Nueva cuenta</button>
            )}
          </>
        }
      >
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>BANCO / SERVICIO</div>
              <input
                value={editCuenta!.banco}
                onChange={(e) => setEditCuenta({ ...editCuenta!, banco: e.target.value })}
                placeholder="Banesco, BDV, Zelle..."
                autoFocus
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>MONEDA</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['usd', 'bs'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setEditCuenta({ ...editCuenta!, moneda: m })}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6,
                      border: `2px solid ${editCuenta!.moneda === m ? colors.orange : colors.border}`,
                      background: editCuenta!.moneda === m ? colors.orangeDim : colors.surface2,
                      color: editCuenta!.moneda === m ? colors.orange : colors.text,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                    }}
                  >{m === 'usd' ? '💵 USD' : '💴 Bs'}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>NÚMERO / EMAIL</div>
              <input
                value={editCuenta!.numero}
                onChange={(e) => setEditCuenta({ ...editCuenta!, numero: e.target.value })}
                placeholder="0102-... o email@..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Mono, monospace' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>TITULAR</div>
              <input
                value={editCuenta!.titular}
                onChange={(e) => setEditCuenta({ ...editCuenta!, titular: e.target.value })}
                placeholder="Razón social o nombre"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button onClick={() => setEditCuenta(null)} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Volver</button>
              <button onClick={guardar} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cuentasBanco.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: colors.textDim, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>Sin cuentas registradas</div>
            ) : cuentasBanco.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{c.banco}</span>
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 4, background: c.moneda === 'usd' ? colors.greenDim : colors.cyan + '22', color: c.moneda === 'usd' ? colors.green : colors.cyan, border: `1px solid ${c.moneda === 'usd' ? colors.greenB : colors.cyan + '55'}` }}>
                      {c.moneda.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.textDim, marginTop: 2 }}>{c.numero}</div>
                  <div style={{ fontSize: 11, color: colors.textDim }}>{c.titular}</div>
                </div>
                <button onClick={() => setEditCuenta(c)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                <button onClick={() => eliminar(c.id)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: colors.red, cursor: 'pointer', fontSize: 13 }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    )
  }

  const renderEditPinModal = () => {
    if (!showEditPin || !currentUser) return null
    const close = () => setShowEditPin(false)
    const validar = (): boolean => {
      if (!pinNew) { setPinError('Ingresa el nuevo PIN'); return false }
      if (!/^\d+$/.test(pinNew)) { setPinError('Solo se permiten números'); return false }
      if (pinNew.length < 4) { setPinError('Mínimo 4 dígitos'); return false }
      if (pinNew !== pinConfirm) { setPinError('Los PINs no coinciden'); return false }
      setPinError('')
      return true
    }
    const guardar = () => {
      if (!validar()) return
      close()
    }
    const eliminar = () => {
      if (currentUser.nivel === 1) { setPinError('No puedes eliminar el PIN del Super Admin'); return }
      close()
    }
    return (
      <ModalShell
        title="🔢 Editar PIN"
        sub={`${currentUser.nombre} · ${currentUser.rol}`}
        onClose={close}
        maxWidth={340}
        footer={
          <>
            <button onClick={eliminar} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.redB}`, background: colors.redDim, color: colors.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>🗑️ Eliminar</button>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={guardar} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>NUEVO PIN</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={10}
              value={pinNew}
              onChange={(e) => setPinNew(e.target.value)}
              placeholder="Solo números"
              autoFocus
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 16, letterSpacing: 4, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>CONFIRMAR PIN</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={10}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') guardar() }}
              placeholder="Repite el PIN"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 16, letterSpacing: 4, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ fontSize: 11, color: colors.red, minHeight: 16, fontFamily: 'DM Mono, monospace' }}>{pinError}</div>
        </div>
      </ModalShell>
    )
  }

  const ModalShell = ({ title, sub, onClose, maxWidth = 480, children, footer }: { title: string; sub?: string; onClose: () => void; maxWidth?: number; children: React.ReactNode; footer?: React.ReactNode }) => (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div className="zk-modal-fade" style={{ background: colors.surface, border: `1px solid ${colors.border2}`, borderRadius: 14, width: '100%', maxWidth, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text }}>{title}</div>
            {sub && <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textDim, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.textMid, cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  const ActBtn = ({ icon, label, sub, onClick, color }: { icon: string; label: string; sub?: string; onClick: () => void; color?: string }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
        background: color ? colors.surface2 : colors.surface2,
        border: `1px solid ${color || colors.border}`,
        transition: 'all 0.13s',
      }}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = colors.orange}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = color || colors.border}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{label}</span>
      {sub && <span style={{ fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>{sub}</span>}
    </button>
  )

  const renderFuncionesModal = () => {
    if (!showFunciones) return null
    const close = () => setShowFunciones(false)
    const has = !!selectedTable
    return (
      <ModalShell
        title="⚡ Funciones de Mesas"
        sub={has ? `Mesa ${selectedTable!.numero}` : 'Sin mesa seleccionada'}
        onClose={close}
        maxWidth={520}
        footer={<button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <ActBtn icon="🔄" label="Cambio de Mesa" sub="Mover ítems a otra" onClick={() => { close(); setOpMode('cambio'); setOpSelecciones(selectedTable && selectedTable.estado !== 'libre' ? [selectedTable.id] : []); setCurrentView('mesas') }} />
          <ActBtn icon="🔗" label="Fusionar Mesas" sub="Combinar 2 cuentas" onClick={() => { close(); setOpMode('fusionar'); setOpSelecciones(selectedTable && selectedTable.estado !== 'libre' ? [selectedTable.id] : []); setCurrentView('mesas') }} />
          <ActBtn icon="✂️" label="Dividir Cuenta" sub="Por monto o personas" onClick={() => { close(); setDivPaso('modo'); setDivModo('monto'); setDivCuentas([]); setShowDividir(true) }} />
          <ActBtn icon="🔀" label="Unir Cuenta" sub="Reunir subcuentas" onClick={() => {
            close()
            if (!selectedTable?.subcuentas?.length) return
            setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, subcuentas: undefined } : t))
          }} />
          <ActBtn icon="👤" label="Asignar Cliente" sub="VIP, créditos" onClick={() => { close(); setClienteSearch(''); setNuevoCli({ nombre: '', tel: '', email: '', notas: '' }); setShowCliente(true) }} />
          <ActBtn icon="🖨️" label="Nota de Consumo" sub="Pre-cuenta" onClick={() => { close(); setShowNotaConsumo(true) }} />
          <ActBtn icon="🎫" label="Descuento" sub="Aplicar % a la cuenta" onClick={() => { close(); setDescuentoPct(0); setShowDescuento(true) }} />
          <ActBtn icon="🏦" label="Cuentas Banco" sub="Para depósitos" onClick={() => { close(); setEditCuenta(null); setShowCuentas(true) }} />
          <ActBtn icon="⚠️" label="Anular Orden" sub="Liberar mesa (Admin)" color={colors.redB} onClick={() => { close(); requireAuth('anularOrden', anularOrden) }} />
        </div>
      </ModalShell>
    )
  }

  const renderClienteModal = () => {
    if (!showCliente) return null
    const close = () => setShowCliente(false)
    const q = clienteSearch.trim().toLowerCase()
    const found = q.length >= 2
      ? clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.tel.includes(q))
      : []
    const asignar = (c: typeof clientes[0]) => {
      if (!selectedTable) return
      setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, cliente: { id: c.id, nombre: c.nombre, tel: c.tel } } : t))
      setSelectedTable({ ...selectedTable, cliente: { id: c.id, nombre: c.nombre, tel: c.tel } })
      close()
    }
    const guardarNuevo = () => {
      if (!nuevoCli.nombre.trim()) return
      const c = { id: `c_${Date.now()}`, nombre: nuevoCli.nombre.trim(), tel: nuevoCli.tel.trim(), email: nuevoCli.email.trim() || undefined, notas: nuevoCli.notas.trim() || undefined }
      setClientes(prev => [...prev, c])
      asignar(c)
    }
    const quitar = () => {
      if (!selectedTable) return
      setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, cliente: undefined } : t))
      setSelectedTable({ ...selectedTable, cliente: undefined })
      close()
    }
    return (
      <ModalShell
        title="👤 Asignar Cliente"
        sub={selectedTable ? `Mesa ${selectedTable.numero}` : ''}
        onClose={close}
        maxWidth={420}
        footer={
          <>
            <button onClick={quitar} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>✕ Quitar</button>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={guardarNuevo} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✅ Crear y asignar</button>
          </>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, textTransform: 'uppercase', marginBottom: 4 }}>Buscar cliente</div>
          <input
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            placeholder="Nombre o teléfono..."
            autoFocus
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {found.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 6 }}>RESULTADOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
              {found.map(c => (
                <div
                  key={c.id}
                  onClick={() => asignar(c)}
                  style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 700, color: colors.text, fontSize: 12 }}>{c.nombre}</div>
                  <div style={{ fontSize: 10, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
                    {c.tel}{c.notas ? ` · ${c.notas}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 8 }}>— O CREAR NUEVO —</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { key: 'nombre', label: 'Nombre', placeholder: 'Nombre completo' },
              { key: 'tel', label: 'Teléfono', placeholder: '+58 / +1' },
              { key: 'email', label: 'Email', placeholder: 'opcional' },
              { key: 'notas', label: 'Notas', placeholder: 'VIP, alergias...' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                <input
                  value={nuevoCli[f.key as keyof typeof nuevoCli]}
                  onChange={(e) => setNuevoCli(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        </div>
      </ModalShell>
    )
  }

  const renderDividirModal = () => {
    if (!showDividir) return null
    const close = () => setShowDividir(false)
    const sub = currentOrder.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const totalUSD = sub * 1.10
    const sumaCuentas = divCuentas.reduce((s, c) => s + c.monto, 0)
    const diff = totalUSD - sumaCuentas
    const valido = divPaso === 'config' && divCuentas.length >= 2 && Math.abs(diff) < 0.01

    const setNumCuentas = (n: number) => {
      const nn = Math.max(2, Math.min(10, n))
      const partido = totalUSD / nn
      setDivCuentas(Array.from({ length: nn }).map(() => ({ monto: parseFloat(partido.toFixed(2)) })))
    }

    const confirmar = () => {
      if (!valido || !selectedTable) return
      setTables(prev => prev.map(t => t.id === selectedTable.id
        ? { ...t, subcuentas: divCuentas.map((c, i) => ({ id: `S${i + 1}`, monto: c.monto })) }
        : t))
      close()
    }

    return (
      <ModalShell
        title="✂️ Dividir Cuenta"
        sub={divPaso === 'modo' ? 'Elige el modo' : `${divCuentas.length} cuentas · Total $${totalUSD.toFixed(2)}`}
        onClose={close}
        maxWidth={560}
        footer={
          <>
            {divPaso === 'config' && (
              <button onClick={() => { setDivPaso('modo'); setDivCuentas([]) }} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>← Atrás</button>
            )}
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            {divPaso === 'config' && (
              <button
                onClick={confirmar}
                disabled={!valido}
                style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: valido ? colors.orange : colors.surface2, color: valido ? '#fff' : colors.textDim, fontSize: 12, fontWeight: 700, cursor: valido ? 'pointer' : 'not-allowed' }}
              >✅ Confirmar</button>
            )}
          </>
        }
      >
        {divPaso === 'modo' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ActBtn icon="💰" label="Por monto" sub="División libre" color={divModo === 'monto' ? colors.orange : undefined} onClick={() => { setDivModo('monto'); setNumCuentas(2); setDivPaso('config') }} />
            <ActBtn icon="🪑" label="Por personas" sub="Cada quien lo suyo" color={divModo === 'items' ? colors.orange : undefined} onClick={() => { setDivModo('items'); setNumCuentas(2); setDivPaso('config') }} />
          </div>
        )}
        {divPaso === 'config' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: colors.textDim }}>NÚMERO DE CUENTAS:</span>
              <button onClick={() => setNumCuentas(divCuentas.length - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, cursor: 'pointer', fontSize: 14 }}>−</button>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.orange, minWidth: 32, textAlign: 'center' }}>{divCuentas.length}</span>
              <button onClick={() => setNumCuentas(divCuentas.length + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, cursor: 'pointer', fontSize: 14 }}>+</button>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'DM Mono, monospace', color: Math.abs(diff) < 0.01 ? colors.green : colors.amber }}>
                Diff: ${diff.toFixed(2)}
              </span>
            </div>
            {divModo === 'monto' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {divCuentas.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: colors.surface2, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: colors.orange, minWidth: 60 }}>Cuenta {i + 1}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.textDim }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={c.monto}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        setDivCuentas(prev => prev.map((x, j) => j === i ? { monto: v } : x))
                      }}
                      style={{ width: 90, padding: '5px 8px', borderRadius: 5, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 16, background: colors.surface2, borderRadius: 8, border: `1px dashed ${colors.border}`, textAlign: 'center', color: colors.textDim, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                Modo "Por personas": asignar cada ítem a una persona<br/>
                <span style={{ fontSize: 10 }}>· Disponible próximamente ·</span>
              </div>
            )}
          </>
        )}
      </ModalShell>
    )
  }

  const renderDescuentoModal = () => {
    if (!showDescuento) return null
    const close = () => setShowDescuento(false)
    const apply = () => {
      close()
    }
    return (
      <ModalShell
        title="🎫 Aplicar Descuento"
        sub="Porcentaje sobre el subtotal"
        onClose={close}
        maxWidth={360}
        footer={
          <>
            <button onClick={close} style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={apply} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✅ Aplicar</button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {[5, 10, 15, 20].map(pct => (
            <button
              key={pct}
              onClick={() => setDescuentoPct(pct)}
              style={{
                padding: '10px 0', borderRadius: 8,
                border: `2px solid ${descuentoPct === pct ? colors.orange : colors.border}`,
                background: descuentoPct === pct ? colors.orangeDim : colors.surface2,
                color: descuentoPct === pct ? colors.orange : colors.text,
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              }}
            >{pct}%</button>
          ))}
        </div>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, color: colors.textDim, marginBottom: 4 }}>O PERSONALIZADO</div>
        <input
          type="number"
          min={0}
          max={100}
          value={descuentoPct}
          onChange={(e) => setDescuentoPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `2px solid ${colors.orange}`, background: colors.surface2, color: colors.text, fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
        />
      </ModalShell>
    )
  }

  const activeCount = tables.filter(t => t.estado !== 'libre').length
  const totalTables = tables.length

  const displayView = currentUser ? currentView : 'login'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bg, color: colors.text, overflow: 'hidden' }}>
      <div style={{ height: 52, background: colors.topbar, borderBottom: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20, flexShrink: 0 }}>
        {/* IZQUIERDA: MARCA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 140 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: colors.orange, fontFamily: 'Fraunces, serif', lineHeight: 1.1 }}>Zytek OS Rest</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: colors.textMid, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginTop: 1 }}>Zytek llc</div>
        </div>

        {/* CENTRO: NEGOCIO */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="zk-business-name" style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 900, color: colors.text, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
            {subscription.tenantName || 'RESTAURANTE'}
          </div>
        </div>

        {/* DERECHA: WIDGETS */}
        <div className="zk-topbar-widgets" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Mesas Pill */}
          <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '4px 10px', borderRadius: 20, border: '1px solid', background: colors.greenDim, borderColor: colors.greenB, color: colors.green, whiteSpace: 'nowrap' }}>
            ● {activeCount}/{totalTables} mesas
          </span>

          {paisCfg.dual && (
            <div
              title={`${paisCfg.tasaLabel} · click para actualizar`}
              onClick={() => requireAuth('actualizarTasa', () => { setTasaInput(String(tasaBCV)); setShowTasaModal(true) })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', minWidth: 70 }}
            >
              <div style={{ fontSize: 7, fontFamily: 'DM Mono, monospace', color: colors.textDim }}>{paisCfg.tasaLabel}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: colors.cyan, lineHeight: 1 }}>{tasaBCV.toFixed(2)}</div>
            </div>
          )}

          <ConnectionIndicator />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: `1px solid ${colors.border}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim }}>{clock.date}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: colors.text, lineHeight: 1 }}>{clock.time}</div>
          </div>

          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.amber, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            onClick={toggleFullScreen}
            title="Pantalla Completa"
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isFullscreen ? '🔳' : '🔲'}
          </button>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.surface2, padding: '3px 10px', borderRadius: 10, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 12 }}>👤</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: colors.text, lineHeight: 1 }}>{currentUser.nombre.split(' ')[0].toUpperCase()}</div>
                <div style={{ fontSize: 7, color: colors.orange, fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>{currentUser.rol?.toUpperCase()}</div>
              </div>
            </div>
          )}

          {currentUser && currentUser.nivel <= 2 && (
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/admin' }}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.blueB}`, background: colors.blueDim, color: colors.blue, fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer', fontWeight: 700 }}
            >
              ADMIN
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 36, background: colors.topbar, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'flex-end', padding: '0 8px', gap: 2, flexShrink: 0 }}>
        <div
          onClick={() => setCurrentView('mesas')}
          style={{
            padding: '6px 14px', borderRadius: '5px 5px 0 0', fontSize: 11, fontFamily: 'DM Mono, monospace',
            cursor: 'pointer', color: currentView === 'mesas' ? colors.orange : colors.textDim,
            border: '1px solid transparent', borderBottom: 'none',
            background: currentView === 'mesas' ? colors.surface2 : 'transparent',
            borderColor: currentView === 'mesas' ? colors.border : 'transparent',
            whiteSpace: 'nowrap', letterSpacing: 0.3, transition: 'all 0.15s',
          }}
        >
          🗺️ MESAS
        </div>
        <div
          onClick={() => selectedTable && setCurrentView('comanda')}
          style={{
            padding: '6px 14px', borderRadius: '5px 5px 0 0', fontSize: 11, fontFamily: 'DM Mono, monospace',
            cursor: selectedTable ? 'pointer' : 'not-allowed',
            color: currentView === 'comanda' ? colors.orange : colors.textDim,
            border: '1px solid transparent', borderBottom: 'none',
            background: currentView === 'comanda' ? colors.surface2 : 'transparent',
            borderColor: currentView === 'comanda' ? colors.border : 'transparent',
            whiteSpace: 'nowrap', letterSpacing: 0.3, transition: 'all 0.15s', opacity: selectedTable ? 1 : 0.5,
          }}
        >
          📋 COMANDA
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {displayView === 'login' && renderLoginView()}
        {displayView === 'destino' && renderDestinoView()}
        {displayView === 'mesas' && renderMesasView()}
        {displayView === 'comanda' && renderComandaView()}
      </div>

      {renderCobrarModal()}
      {renderCorteXModal()}
      {renderCorteZModal()}
      {renderFuncionesMesaModal()}
      {renderDescuentoModal()}
      {renderCortezConfirmModal()}
      {renderCuentasModal()}
      {renderEditPinModal()}
      {renderClienteModal()}
      {renderDividirModal()}
      {renderNotaConsumoModal()}
      {renderFuncionesModal()}
      {renderAuthOverlay()}
      {renderTasaModal()}
      {renderSuccessOverlay()}
      {renderQuickClientModal()}
      {renderCancelReasonModal()}

      <style>{`
        :root[data-theme="dark"] {
          --zk-bg: #0d0d0f; --zk-surface: #16161a; --zk-surface2: #1e1e24; --zk-topbar: #111114;
          --zk-border: rgba(255,255,255,0.08); --zk-border2: rgba(255,255,255,0.14);
          --zk-text: #f0f0f5; --zk-text-mid: #b0b0c0; --zk-text-dim: #606070;
          --zk-orange: #ff7c20; --zk-green: #2ee87a; --zk-red: #ff4757;
          --zk-blue: #38b6ff; --zk-purple: #a855f7; --zk-amber: #ffc040; --zk-cyan: #00d4ff;
          --zk-scroll-thumb: rgba(255,255,255,0.22); --zk-scroll-thumb-hover: rgba(255,255,255,0.4);
          --zk-scroll-track: rgba(0,0,0,0.25);
        }
        :root[data-theme="light"] {
          --zk-bg: #f4f4f8; --zk-surface: #fff; --zk-surface2: #f0f0f5; --zk-topbar: #fff;
          --zk-border: rgba(0,0,0,0.1); --zk-border2: rgba(0,0,0,0.18);
          --zk-text: #111118; --zk-text-mid: #444455; --zk-text-dim: #888899;
          --zk-orange: #ff7c20; --zk-green: #2ee87a; --zk-red: #ff4757;
          --zk-blue: #38b6ff; --zk-purple: #a855f7; --zk-amber: #ffc040; --zk-cyan: #00d4ff;
          --zk-scroll-thumb: rgba(0,0,0,0.22); --zk-scroll-thumb-hover: rgba(0,0,0,0.4);
          --zk-scroll-track: rgba(0,0,0,0.06);
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--zk-scroll-track); }
        ::-webkit-scrollbar-thumb { background: var(--zk-scroll-thumb); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--zk-scroll-thumb-hover); }
        * { scrollbar-width: thin; scrollbar-color: var(--zk-scroll-thumb) var(--zk-scroll-track); }
        .zk-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .zk-mesa { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .zk-mesa:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.35); }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .zk-modal-fade { animation: zkFadeIn 0.16s ease; }
        @keyframes zkFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .zk-rkey { transition: filter 0.12s, background 0.12s; }
        .zk-rkey:hover { filter: brightness(1.1); }
        .zk-rkey:active { filter: brightness(0.88); }
        .zk-rkey.zk-selected { outline: 3px solid #fff; outline-offset: -3px; filter: brightness(1.35); }
        .zk-amb-active { box-shadow: inset 3px 0 0 var(--zk-green); }
        @media print {
          body * { visibility: hidden; }
          .zytek-print-area, .zytek-print-area * { visibility: visible; }
          .zytek-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; border: none !important; }
          .zytek-print-area * { color: #000 !important; background: transparent !important; border-color: #aaa !important; }
        }
        @media (max-width: 950px) {
          .zk-business-name { display: none; }
          .zk-topbar-widgets { gap: 8px !important; }
        }
        @media (max-width: 600px) {
          .zk-topbar-widgets span { display: none; }
        }
      `}</style>
    </div>
  )
}