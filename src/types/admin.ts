// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin Types
// Tipos compartidos para todos los componentes del Admin
// Archivo: src/types/admin.ts
// ─────────────────────────────────────────────────────────────

import type { PlanTier } from '@/lib/admin-gates'

// ── LICENCIA / SESIÓN ──────────────────────────────────────
export interface AdminSession {
  userId: string
  userName: string
  userRole: string
  userAvatar: string    // Iniciales para el chip
  avatarColor: string   // Color de fondo del avatar
  tenantId: string
  tenantName: string
  plan: PlanTier
}

// ── MENÚ ───────────────────────────────────────────────────
export interface Categoria {
  id: string
  tenant_id: string
  nombre: string
  emoji: string
  imagen_url?: string
  orden: number
  activo: boolean
  parent_id?: string    // Para sub-grupos
  items_count?: number  // Calculado
}

export interface MenuItem {
  id: string
  tenant_id: string
  nombre: string
  descripcion?: string
  precio: number
  cat: string           // Nombre de la categoría
  cat_id?: string       // ID de la categoría
  emoji: string
  imagen_url?: string
  activo: boolean
  agotado: boolean
  orden?: number
  // Precios multi-variante (tamaño, presentación)
  variantes?: MenuVariante[]
  // Modificadores asignados
  mod_grupos?: string[] // IDs de grupos de modificadores
  // Receta / costos
  costo?: number
  receta?: RecetaItem[]
}

export interface MenuVariante {
  nombre: string        // "Personal", "Mediana", "Grande"
  precio: number
}

export interface ModGrupo {
  id: string
  tenant_id: string
  nombre: string
  tipo: 'seleccion_unica' | 'seleccion_multiple' | 'obligatorio'
  min_seleccion: number
  max_seleccion: number
  activo: boolean
  orden: number
}

export interface Modificador {
  id: string
  tenant_id: string
  nombre: string
  precio: number        // Precio adicional (0 si es sin costo)
  tipo: 'extra' | 'sin' | 'variante'
  grupo_id: string      // ID del grupo al que pertenece
  grupo?: string        // Nombre del grupo (join)
  emoji?: string
  activo: boolean
  orden?: number
}

export interface RecetaItem {
  insumo_id: string
  insumo_nombre: string
  cantidad: number
  unidad: string
  costo_unitario: number
}

// ── VENTAS ─────────────────────────────────────────────────
export interface Venta {
  id: string
  tenant_id: string
  total: number
  subtotal?: number
  descuento?: number
  impuesto?: number
  payment_method: string
  created_at: string
  tipo: 'venta' | 'cortesia' | 'anulada'
  items: VentaItem[]
  cajero: string
  cajero_id?: string
  numero_pedido?: string
  modo?: 'mesa' | 'streetfood' | 'togo'
  mesa?: string
  mesa_id?: string
  cliente_nombre?: string
  cliente_id?: string
  notas?: string
}

export interface VentaItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
  modificadores?: string[]
  variante?: string
}

// ── CIERRES ────────────────────────────────────────────────
export interface CierreZ {
  id: string
  tenant_id: string
  fecha: string
  total_ventas: number
  total_transacciones: number
  desglose_metodos: Record<string, number>
  efectivo_esperado: number
  efectivo_real: number
  diferencia: number
  cajero: string
  cajero_id?: string
  turno?: string
  created_at: string
  notas?: string
}

// ── COMPRAS / INVENTARIO (Pro) ─────────────────────────────
export interface Proveedor {
  id: string
  tenant_id: string
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  rif?: string
  activo: boolean
  notas?: string
}

export interface Insumo {
  id: string
  tenant_id: string
  nombre: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  proveedor_id?: string
  proveedor?: string
  activo: boolean
}

export interface Compra {
  id: string
  tenant_id: string
  proveedor_id: string
  proveedor?: string
  items: CompraItem[]
  total: number
  fecha: string
  estado: 'pendiente' | 'recibida' | 'parcial' | 'cancelada'
  notas?: string
  created_at: string
}

export interface CompraItem {
  insumo_id: string
  nombre: string
  cantidad: number
  costo_unitario: number
  subtotal: number
}

// ── CLIENTES (Pro) ─────────────────────────────────────────
export interface Cliente {
  id: string
  tenant_id: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  rif?: string
  tipo: 'regular' | 'vip' | 'mayorista'
  credito_habilitado: boolean
  credito_limite: number
  credito_usado: number
  puntos_fidelidad: number
  nivel_fidelidad: 'bronce' | 'plata' | 'oro' | 'vip'
  notas?: string
  created_at: string
  ultima_visita?: string
  total_compras: number
  visitas: number
}

export interface Lead {
  id: string
  tenant_id: string
  nombre: string
  telefono?: string
  email?: string
  origen: string
  estado: 'nuevo' | 'contactado' | 'negociando' | 'ganado' | 'perdido'
  valor_estimado: number
  notas?: string
  created_at: string
}

// ── USUARIOS / PERMISOS (Pro) ──────────────────────────────
export interface Usuario {
  id: string
  tenant_id: string
  nombre: string
  pin_hash: string      // BCrypt hash
  rol: 'admin' | 'cajero' | 'mesero' | 'cocina' | 'custom'
  activo: boolean
  avatar_color: string
  created_at: string
  ultimo_login?: string
}

export interface Permiso {
  rol: string
  modulo: string
  leer: boolean
  escribir: boolean
  eliminar: boolean
}

// ── CONFIGURACIÓN ──────────────────────────────────────────
export interface TenantConfig {
  tenant_id: string
  // POS
  pos_mode: 'restaurant' | 'streetfood' | 'combinado'
  mesas_habilitadas: boolean
  max_mesas: number
  numeracion_prefijo: string
  to_go_habilitado: boolean
  // Moneda
  tasa_cambio: number
  moneda_principal: string
  moneda_secundaria: string
  // Métodos de pago
  metodos_pago: MetodoPago[]
  // Impuestos
  impuesto_habilitado: boolean
  impuesto_nombre: string
  impuesto_porcentaje: number
  impuesto_incluido: boolean
  // Reportes
  reporte_email: string
  reporte_frecuencia: 'diario' | 'semanal' | 'mensual' | 'desactivado'
  reporte_config: ReporteConfig
  // Negocio
  nombre_negocio: string
  direccion?: string
  telefono?: string
  rif?: string
  logo_url?: string
}

export interface MetodoPago {
  id: string
  label: string
  icon: string
  activo: boolean
  // Para cuentas bancarias
  banco?: string
  cuenta?: string
  titular?: string
}

export interface ReporteConfig {
  mostrar_kpis: boolean
  mostrar_tabla_ventas: boolean
  mostrar_top_sellers: boolean
  mostrar_desglose_metodos: boolean
  mostrar_comparativas: boolean
  mostrar_graficos: boolean
  metodos_visibles: string[]
}

// ── LOG AUDITORÍA ──────────────────────────────────────────
export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  user_name: string
  action: string
  module: string
  details?: string
  created_at: string
}

// ── MÉTODOS DE PAGO DEFAULT ────────────────────────────────
export const DEFAULT_METODOS_PAGO: MetodoPago[] = [
  { id: 'efectivo',      label: 'Efectivo',      icon: '💵', activo: true },
  { id: 'tarjeta',       label: 'Tarjeta',       icon: '💳', activo: true },
  { id: 'zelle',         label: 'Zelle',         icon: '📱', activo: true },
  { id: 'pago_movil',    label: 'Pago Móvil',    icon: '📲', activo: true },
  { id: 'divisas',       label: 'Divisas',       icon: '💲', activo: true },
  { id: 'transferencia', label: 'Transferencia',  icon: '🏦', activo: true },
]
