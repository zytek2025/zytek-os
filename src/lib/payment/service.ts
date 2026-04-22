// ─────────────────────────────────────────────────────────────
// ZytekOS · Payment · Servicio
// Orquesta el cobro end-to-end: aplica movimientos FinTrack,
// marca la comanda como paid y registra audit trace.
// Archivo: src/lib/payment/service.ts
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/lib/supabase.client'
import { fintrack } from '@/lib/fintrack/service'
import { idbGet, idbPut, enqueueSync } from '@/lib/idb.client'
import type { CobroInput, CobroResultado } from './types'

const BACKOFFS_MS = [200, 500, 1200] as const

function isNetworkError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as { message?: string; code?: string }
  const msg = String(anyErr?.message ?? err).toLowerCase()
  if (msg.includes('failed to fetch')) return true
  if (msg.includes('fetch failed'))    return true
  if (msg.includes('network'))         return true
  if (msg.includes('timeout'))         return true
  if (anyErr?.code === 'NETWORK_ERROR') return true
  if (typeof navigator !== 'undefined' && !navigator.onLine && !anyErr?.code) return true
  return false
}

export function mapearErrorCobro(err: unknown): string {
  if (!err) return 'Error desconocido al procesar el cobro'
  if (typeof err === 'string') return err
  const anyErr = err as { code?: string; message?: string }
  const code = anyErr?.code
  const msg  = String(anyErr?.message ?? '').toLowerCase()

  if (code === 'PGRST116' || msg.includes('coerce') || msg.includes('no rows')) {
    return 'La comanda aun no se sincroniza con el servidor. Intenta de nuevo en unos segundos.'
  }
  if (isNetworkError(err)) {
    return 'Sin conexion estable. El cobro se guardo localmente y se sincronizara al reconectar.'
  }
  if (code === '23505') {
    return 'La comanda ya fue procesada desde otra sesion.'
  }
  if (code === '23514') {
    return 'La comanda esta en un estado que no permite cobrarla.'
  }
  if (code === '42501') {
    return 'Tu usuario no tiene permisos para cobrar esta comanda.'
  }
  if (anyErr?.message) return anyErr.message
  return 'Error al procesar el cobro'
}

async function retryNetwork<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < BACKOFFS_MS.length; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isNetworkError(err)) throw err
      if (i < BACKOFFS_MS.length - 1) {
        await new Promise(r => setTimeout(r, BACKOFFS_MS[i]))
      }
    }
  }
  throw lastErr
}

export class PaymentService {
  async procesarCobro(input: CobroInput): Promise<CobroResultado> {
    if (input.pagos.length === 0) {
      throw new Error('Debe registrar al menos un pago')
    }

    // Paso 1 · SELECT con maybeSingle + fallback IDB
    let order: Record<string, any> | null = null
    let errOrder: unknown = null
    try {
      const r = await supabase
        .from('pos_orders')
        .select('*')
        .eq('id', input.orderId)
        .eq('tenant_id', input.tenantId)
        .maybeSingle()
      order = r.data as Record<string, any> | null
      errOrder = r.error
    } catch (e) {
      errOrder = e
    }

    if (errOrder && !isNetworkError(errOrder)) {
      throw new Error(mapearErrorCobro(errOrder))
    }

    if (!order) {
      // Fallback IDB: comanda aun no sincronizada
      const local = await idbGet<Record<string, any>>('pos_orders', input.orderId)
      if (local && local.tenant_id === input.tenantId) {
        order = local
      } else {
        throw new Error('Comanda no encontrada')
      }
    }

    if (order.status === 'paid') {
      throw new Error('Esta comanda ya fue cobrada')
    }
    if (order.status === 'cancelled') {
      throw new Error('Esta comanda esta anulada')
    }

    const snapshotPrevio = { ...order }

    // Paso 2 · Aplicar movimientos FinTrack (sin retry aqui;
    // fintrack.aplicarMovimiento maneja su propia persistencia)
    const movimientoIds: string[] = []
    for (const pago of input.pagos) {
      const movId = await fintrack.aplicarMovimiento({
        tenantId: input.tenantId,
        cuentaId: pago.cuentaId,
        tipo: 'ingreso_venta',
        monto: pago.monto,
        monedaCodigo: pago.monedaCodigo,
        usuarioId: input.cajeroId,
        referenciaTipo: 'pos_order',
        referenciaId: input.orderId,
        formaPagoSlug: pago.formaPagoSlug,
        descripcion: `Venta comanda ${order.numero_comanda ?? order.order_number ?? input.orderId.slice(-6)}`,
        metadata: {
          mesa: order.mesa,
          referencia_pago: pago.referencia,
          nota: pago.nota,
        },
      })
      movimientoIds.push(movId)
    }

    // Paso 3 · Write-through: IDB primero, despues UPDATE remoto con retry
    const tsCerrada = new Date().toISOString()
    const parches = {
      status: 'paid',
      cobrado_por: input.cajeroId,
      ts_cerrada: tsCerrada,
      propinas: input.propina ?? order.propinas ?? 0,
      descuento_total: input.descuento ?? order.descuento_total ?? 0,
      notas: input.notas ?? order.notas,
    }
    const ordenActualizada = { ...order, ...parches }

    await idbPut('pos_orders', ordenActualizada)
    await enqueueSync('pos', 'pos_orders', 'upsert', ordenActualizada)

    try {
      await retryNetwork(async () => {
        const { error } = await supabase
          .from('pos_orders')
          .update(parches)
          .eq('id', input.orderId)
          .eq('tenant_id', input.tenantId)
        if (error) throw error
      })
    } catch (err) {
      if (isNetworkError(err)) {
        // OK: el write-through via sync_queue reconciliara al reconectar
      } else {
        // Conflicto logico: revertir IDB y propagar error mapeado
        await idbPut('pos_orders', snapshotPrevio)
        throw new Error(mapearErrorCobro(err))
      }
    }

    // Paso 4 · Audit trace con retry + fallback a cola (NUNCA se pierde)
    const auditPayload = {
      tenant_id: input.tenantId,
      user_id: input.cajeroId,
      action: 'cobro_completado',
      entity_type: 'pos_order',
      entity_id: input.orderId,
      data_after: {
        total: order.total,
        pagos_count: input.pagos.length,
        propina: input.propina ?? 0,
        descuento: input.descuento ?? 0,
        movimiento_ids: movimientoIds,
      },
      reason: `Cobro de comanda ${order.numero_comanda ?? order.order_number ?? input.orderId.slice(-6)}`,
    }

    try {
      await retryNetwork(async () => {
        const { error } = await supabase.from('pos_audit_trace').insert(auditPayload)
        if (error) throw error
      })
    } catch {
      await enqueueSync('pos', 'pos_audit_trace', 'upsert', auditPayload)
    }

    const totalCobrado = input.pagos.reduce((sum, p) => sum + p.monto, 0)

    return {
      orderId: input.orderId,
      movimientoIds,
      totalCobrado,
      numeroComanda: (order.numero_comanda as string | null) ?? null,
      timestamp: tsCerrada,
    }
  }
}

export const paymentService = new PaymentService()
