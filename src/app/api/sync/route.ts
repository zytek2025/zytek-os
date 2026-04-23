import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { syncQueueSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

// Tablas a las que se permite aplicar operaciones desde la cola offline.
// Incluye las heredadas (ventas/inventario/clientes/menu_items/turnos) y
// las del flujo POS/cobro que antes quedaban atrapadas en IndexedDB.
const ALLOWED_TABLES = new Set([
  'ventas', 'inventario', 'clientes', 'menu_items', 'turnos',
  'pos_orders', 'pos_order_items', 'pos_payments', 'pos_audit_trace',
])

// Allowlist plana de columnas conocidas en las tablas soportadas.
// Es defensa en profundidad: verifyAuth + tenant_id + RLS son la primera
// barrera; esto evita que un cliente comprometido inyecte columnas ajenas.
const ALLOWED_FIELDS = new Set([
  // Comunes
  'id', 'tenant_id', 'created_at', 'updated_at', 'ts',
  // menu_items / legacy
  'nombre', 'cat', 'precio', 'precio_matriz', 'modificadores',
  'receta', 'activo', 'emoji', 'descripcion', 'kds_station',
  'categoria_id', 'subgroup_id', 'image_url',
  // inventario
  'nom', 'uni', 'stock', 'min', 'costo', 'ubicacion_id',
  // clientes
  'tel', 'email', 'visitas', 'gasto', 'cxc', 'adelanto',
  'puntos', 'nivel', 'tipo', 'estado',
  // ventas / turnos legacy
  'items', 'total', 'total_bs', 'formas_pago', 'iva', 'igtf',
  'mesa', 'turno_id', 'cliente_id', 'cajero', 'cajero_id',
  'apertura', 'cierre', 'fondo',
  // pos_orders
  'session_id', 'waiter_id', 'cobrado_por', 'order_number',
  'numero_comanda', 'status', 'subtotal', 'impuestos', 'propinas',
  'descuento_total', 'notas', 'ts_abierta', 'ts_cerrada',
  // pos_order_items
  'order_id', 'menu_item_id', 'precio_unitario', 'cantidad',
  'enviado_cocina', 'ts_enviado',
  // pos_audit_trace
  'user_id', 'action', 'entity_type', 'entity_id', 'authorized_by',
  'data_before', 'data_after', 'is_anomaly', 'reason',
  'device_id', 'ip_address',
  // pos_payments
  'forma_pago', 'monto', 'monto_bs', 'moneda_codigo', 'referencia',
])

// Campos JSONB que se entregan tal cual a Postgres sin filtrado recursivo.
// Recursar sobre un jsonb con allowlist plana muta silenciosamente los
// payloads del audit log y los modificadores de items.
const PASSTHROUGH_JSONB = new Set([
  'data_before', 'data_after', 'modificadores', 'formas_pago',
  'metadata', 'precio_matriz', 'receta', 'items',
])

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = syncQueueSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: 'Formato de cola invalido',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { operations } = validation.data
    const db = getServerClient()
    const results: Array<{ id: string; ok: boolean; error?: string }> = []

    for (const op of operations) {
      if (!ALLOWED_TABLES.has(op.tabla)) {
        results.push({ id: op.id, ok: false, error: 'Tabla no permitida' })
        continue
      }

      try {
        const safeData = sanitizeData(op.data)

        if (op.op === 'upsert') {
          const { error } = await db
            .from(op.tabla)
            .upsert({ ...safeData, tenant_id: auth.tenantId })
          results.push({ id: op.id, ok: !error, error: error?.message })
        } else if (op.op === 'delete') {
          const rowId = (op.data as { id?: string })?.id
          if (!rowId) {
            results.push({ id: op.id, ok: false, error: 'ID requerido para delete' })
            continue
          }
          const { error } = await db
            .from(op.tabla)
            .delete()
            .eq('id', rowId)
            .eq('tenant_id', auth.tenantId)
          results.push({ id: op.id, ok: !error, error: error?.message })
        }
      } catch (e: any) {
        results.push({ id: op.id, ok: false, error: e.message })
      }
    }

    const processed = results.filter(r => r.ok).length

    if (processed < operations.length) {
      logSecurityEvent(
        'SYNC_PARTIAL_FAILURE',
        `processed=${processed}/${operations.length}`,
        auth.tenantId,
        auth.userId
      )
    }

    return NextResponse.json({
      ok: true,
      processed,
      failed: operations.length - processed,
      total: operations.length,
      results: results.slice(0, 100),
    })
  } catch (e: any) {
    logSecurityEvent('SYNC_ERROR', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_FIELDS.has(key)) continue
    sanitized[key] = PASSTHROUGH_JSONB.has(key)
      ? value
      : sanitizeValue(value)
  }

  return sanitized
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.slice(0, 1000).replace(/[\x00-\x1F\x7F]/g, '')
  }
  if (typeof value === 'number') {
    return isFinite(value) ? value : 0
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (value === null) {
    return null
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (typeof value === 'object') {
    return sanitizeData(value as Record<string, unknown>)
  }
  return null
}
