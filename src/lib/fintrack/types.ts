// ─────────────────────────────────────────────────────────────
// ZytekOS · FinTrack · Tipos
// Archivo: src/lib/fintrack/types.ts
// ─────────────────────────────────────────────────────────────

export type MonedaCodigo = 'USD' | 'VES' | 'MXN' | 'COP' | 'PEN' | 'ARS' | 'EUR'

export type FormaPagoSlug =
  | 'efectivo'
  | 'tarjeta_pos'
  | 'transferencia'
  | 'pago_movil'
  | 'biopago'
  | 'zelle'
  | 'paypal'
  | 'cripto'
  | 'credito_cliente'

export type CuentaTipo =
  | 'efectivo'
  | 'bancaria'
  | 'digital'
  | 'credito_cliente'
  | 'otro'

export type MovimientoTipo =
  | 'ingreso_venta'
  | 'deposito'
  | 'retiro'
  | 'transferencia_salida'
  | 'transferencia_entrada'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'apertura'

export interface Moneda {
  codigo: MonedaCodigo
  nombre: string
  simbolo: string
  decimales: number
}

export interface FormaPago {
  slug: FormaPagoSlug
  nombre: string
  descripcion?: string
  icono?: string
  requiere_referencia: boolean
  requiere_cuenta: boolean
}

export interface Cuenta {
  id: string
  tenant_id: string
  nombre: string
  tipo: CuentaTipo
  moneda_codigo: MonedaCodigo
  numero_cuenta?: string
  titular?: string
  banco?: string
  saldo_inicial: number
  saldo_actual: number
  notas?: string
  activa: boolean
  orden: number
}

export interface Movimiento {
  id: string
  tenant_id: string
  cuenta_id: string
  tipo: MovimientoTipo
  monto: number
  moneda_codigo: MonedaCodigo
  tasa_usada?: number
  monto_moneda_principal?: number
  cuenta_contraparte_id?: string
  referencia_tipo?: string
  referencia_id?: string
  forma_pago_slug?: FormaPagoSlug
  descripcion?: string
  usuario_id?: string
  saldo_antes: number
  saldo_despues: number
  created_at: string
}

export interface AplicarMovimientoInput {
  tenantId: string
  cuentaId: string
  tipo: MovimientoTipo
  monto: number
  monedaCodigo: MonedaCodigo
  usuarioId: string
  referenciaTipo?: string
  referenciaId?: string
  formaPagoSlug?: FormaPagoSlug
  cuentaContraparteId?: string
  descripcion?: string
  metadata?: Record<string, unknown>
}

export interface CuentaPorFormaPago {
  cuenta_id: string
  cuenta_nombre: string
  cuenta_tipo: CuentaTipo
  cuenta_moneda: MonedaCodigo
  cuenta_saldo: number
  es_default: boolean
}
