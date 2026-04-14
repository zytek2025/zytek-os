// ═══════════════════════════════════════════════════════════════
//  ZytekOS — Core Types
//  Compartidos entre server y client
// ═══════════════════════════════════════════════════════════════

// ── Plans & Modules ──────────────────────────────────────────
export type Plan = 'basic' | 'pro' | 'ent'
export type ModuleId = 'pos' | 'admin' | 'mesero' | 'kds' | 'retail' | 'crm' | 'fintrack' | 'constructor'

export const MODULE_PLANS: Record<ModuleId, Plan> = {
  pos:         'basic',
  mesero:      'basic',
  kds:         'basic',
  admin:       'pro',
  retail:      'pro',
  crm:         'pro',
  fintrack:    'ent',
  constructor: 'ent',
}

export const PLAN_ORDER: Record<Plan, number> = { basic: 0, pro: 1, ent: 2 }

// ── License ──────────────────────────────────────────────────
export interface License {
  id:        string
  key:       string
  tenantId:  string
  tenantName:string
  plan:      Plan
  modules:   ModuleId[] | ['*']
  maxUsers:  number
  expiresAt: string
  active:    boolean
  createdAt: string
}

export interface LicenseValidationResult {
  ok:        boolean
  license?:  License
  reason?:   'no_key' | 'invalid_format' | 'not_found' | 'expired' | 'inactive' | 'module_not_allowed' | 'offline_no_cache' | 'network_error'
  fromCache? :boolean
  offline?:  boolean
}

// ── Auth / Users ─────────────────────────────────────────────
export type UserLevel = 1 | 2 | 3 | 4 | 5
export interface ZytekUser {
  id:       string
  nombre:   string
  pin:      string          // hashed en BD, plain en demo
  nivel:    UserLevel
  rol:      string
  tenantId: string
  activo:   boolean
  color?:   string
}

// ── Tenant ───────────────────────────────────────────────────
export interface Tenant {
  id:     string
  nombre: string
  plan:   Plan
  pais:   've' | 'us' | 'co' | 'mx'
  tasa:   number             // tasa BCV si aplica
}

// ── Ventas / POS ─────────────────────────────────────────────
export interface MenuItem {
  id:          string
  nombre:      string
  cat:         string
  precio:      number
  precioMatriz?: Record<string, number[]>
  modificadores?: string[]
  receta?:     Array<{ invId: string; cantidad: number }>
  activo:      boolean
  descripcion?: string
  emoji?:      string
  kdsStation?: string
}

export interface VentaItem {
  itemId:        string
  nombre:        string
  precio:        number
  cantidad:      number
  modificadores: string[]
  nota?:         string
  subtotal:      number
}

export interface Venta {
  id:         string
  turnoId:    string
  tenantId:   string
  mesa?:      string
  clienteId?: string
  items:      VentaItem[]
  total:      number
  totalBs?:   number
  formasPago: Array<{ tipo: string; monto: number; montoUSD: number }>
  iva:        number
  igtf:       number
  cajero:     string
  ts:         number
  tipo:       'venta' | 'devolucion'
  created_at: string
  createdAt?: string
}

// ── Inventario ───────────────────────────────────────────────
export interface InvItem {
  id:          string
  nom:         string
  cat:         string
  uni:         string
  stock:       number
  min:         number
  costo:       number
  ubicacionId?: string
  tenantId:    string
}

export interface InvMovimiento {
  id:       string
  tenantId: string
  itemId:   string
  tipo:     'entrada' | 'salida' | 'ajuste' | 'conteo'
  cantidad: number
  stockAnt: number
  stockNvo: number
  ref?:     string
  user:     string
  ts:       number
}

// ── Clientes / CRM ───────────────────────────────────────────
export interface Cliente {
  id:       string
  tenantId: string
  nombre:   string
  tel?:     string
  email?:   string
  visitas:  number
  gasto:    number
  cxc:      number
  adelanto: number
  puntos:   number
  nivel:    'Bronce' | 'Plata' | 'Oro' | 'VIP' | string
  tipo:     'regular' | 'vip' | 'corporativo' | 'frecuente' | string
  estado:   'activo' | 'inactivo' | 'Activo' | string
  ultima?:  string
}

export interface CxC {
  id:        string
  tenantId:  string
  clienteId: string
  cliente?:  string
  concepto:  string
  total:     number
  pagado:    number
  saldo:     number
  fecha:     string
  vence:     string
  estado:    'activa' | 'pagada' | 'vencida'
}

// ── Corte Z ──────────────────────────────────────────────────
export interface CorteZ {
  id:            string
  tenantId:      string
  turnoId:       string
  cajero:        string
  apertura:      string
  cierre:        string
  totalVentas:   number
  totalBs:       number
  totalTickets:  number
  formasPago:    unknown[]
  iva:           number
  igtf:          number
  tasa:          number
  checksum:      string
  checksumNube?: string
  validado:      boolean
  sincronizado:  boolean
  txCount:       number
  version:       string
}

// ── EventBus ─────────────────────────────────────────────────
export interface BusEvent {
  event:   string
  payload: unknown
  ts:      number
  src:     string
  tenantId?: string
}

// ── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok:     boolean
  data?:  T
  error?: string
  code?:  string
}
