// ─────────────────────────────────────────────────────────────
// ZytekOS · Payment · Servicio
// Orquesta el cobro end-to-end: aplica movimientos FinTrack,
// marca la comanda como paid y registra audit trace.
// Archivo: src/lib/payment/service.ts
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/lib/supabase.client'
import { fintrack } from '@/lib/fintrack/service'
import type { CobroInput, CobroResultado } from './types'

export class PaymentService {
  async procesarCobro(input: CobroInput): Promise<CobroResultado> {
    if (input.pagos.length === 0) {
      throw new Error('Debe registrar al menos un pago')
    }

    const { data: order, error: errOrder } = await supabase
      .from('pos_orders')
      .select('*')
      .eq('id', input.orderId)
      .eq('tenant_id', input.tenantId)
      .single()

    if (errOrder) throw errOrder
    if (!order) throw new Error('Comanda no encontrada')
    if (order.status === 'paid') {
      throw new Error('Esta comanda ya fue cobrada')
    }
    if (order.status === 'cancelled') {
      throw new Error('Esta comanda esta anulada')
    }

    // TODO v2: validar suma de pagos convertida a moneda principal = total comanda
    // Por ahora confiamos en el UI que no deja confirmar si pendiente > 0

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
        descripcion: `Venta comanda ${order.numero_comanda ?? order.order_number}`,
        metadata: {
          mesa: order.mesa,
          referencia_pago: pago.referencia,
          nota: pago.nota,
        },
      })
      movimientoIds.push(movId)
    }

    const { error: errUpdate } = await supabase
      .from('pos_orders')
      .update({
        status: 'paid',
        cobrado_por: input.cajeroId,
        ts_cerrada: new Date().toISOString(),
        propinas: input.propina ?? order.propinas ?? 0,
        descuento_total: input.descuento ?? order.descuento_total ?? 0,
        notas: input.notas ?? order.notas,
      })
      .eq('id', input.orderId)
      .eq('tenant_id', input.tenantId)

    if (errUpdate) throw errUpdate

    await supabase.from('pos_audit_trace').insert({
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
      reason: `Cobro de comanda ${order.numero_comanda ?? order.order_number}`,
    })

    const totalCobrado = input.pagos.reduce((sum, p) => sum + p.monto, 0)

    return {
      orderId: input.orderId,
      movimientoIds,
      totalCobrado,
      numeroComanda: order.numero_comanda,
      timestamp: new Date().toISOString(),
    }
  }
}

export const paymentService = new PaymentService()
