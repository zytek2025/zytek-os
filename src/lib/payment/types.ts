// ─────────────────────────────────────────────────────────────
// ZytekOS · Payment · Tipos
// Archivo: src/lib/payment/types.ts
// ─────────────────────────────────────────────────────────────
import type { FormaPagoSlug, MonedaCodigo } from '../fintrack/types'

export interface PagoLinea {
  id: string
  formaPagoSlug: FormaPagoSlug
  cuentaId: string
  monto: number
  monedaCodigo: MonedaCodigo
  referencia?: string
  nota?: string
}

export interface CobroInput {
  orderId: string
  tenantId: string
  cajeroId: string
  pagos: Omit<PagoLinea, 'id'>[]
  propina?: number
  descuento?: number
  notas?: string
}

export interface CobroResultado {
  orderId: string
  movimientoIds: string[]
  totalCobrado: number
  numeroComanda: string | null
  timestamp: string
}
