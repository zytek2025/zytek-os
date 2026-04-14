import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { syncQueueSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

const ALLOWED_TABLES = ['ventas', 'inventario', 'clientes', 'menu_items', 'turnos']

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
        error: 'Formato de cola inválido',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { items } = validation.data
    const db = getServerClient()
    const results = []

    for (const op of items) {
      if (!ALLOWED_TABLES.includes(op.table)) {
        results.push({ id: op.timestamp, ok: false, error: 'Tabla no permitida' })
        continue
      }

      try {
        const safeData = sanitizeData(op.data)

        if (op.operation === 'insert') {
          const { error } = await db
            .from(op.table)
            .upsert({ ...safeData, tenant_id: auth.tenantId })
          results.push({ id: op.timestamp, ok: !error, error: error?.message })
        } else if (op.operation === 'update') {
          const id = safeData.id || op.data.id
          if (!id) {
            results.push({ id: op.timestamp, ok: false, error: 'ID requerido para update' })
            continue
          }
          const { error } = await db
            .from(op.table)
            .update(safeData)
            .eq('id', id)
            .eq('tenant_id', auth.tenantId)
          results.push({ id: op.timestamp, ok: !error, error: error?.message })
        } else if (op.operation === 'delete') {
          const id = op.data?.id
          if (!id) {
            results.push({ id: op.timestamp, ok: false, error: 'ID requerido para delete' })
            continue
          }
          const { error } = await db
            .from(op.table)
            .delete()
            .eq('id', id)
            .eq('tenant_id', auth.tenantId)
          results.push({ id: op.timestamp, ok: !error, error: error?.message })
        }
      } catch (e: any) {
        results.push({ id: op.timestamp, ok: false, error: e.message })
      }
    }

    const processed = results.filter(r => r.ok).length
    
    if (processed < items.length) {
      logSecurityEvent(
        'SYNC_PARTIAL_FAILURE',
        `processed=${processed}/${items.length}`,
        auth.tenantId,
        auth.userId
      )
    }

    return NextResponse.json({
      ok: true,
      processed,
      failed: items.length - processed,
      total: items.length,
      results: results.slice(0, 50),
    })
  } catch (e: any) {
    logSecurityEvent('SYNC_ERROR', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set([
    'id', 'nombre', 'cat', 'precio', 'precio_matriz', 'modificadores',
    'receta', 'activo', 'emoji', 'descripcion', 'kds_station',
    'nom', 'uni', 'stock', 'min', 'costo', 'ubicacion_id',
    'tel', 'email', 'visitas', 'gasto', 'cxc', 'adelanto',
    'puntos', 'nivel', 'tipo', 'estado',
    'items', 'total', 'total_bs', 'formas_pago', 'iva', 'igtf',
    'mesa', 'turno_id', 'cliente_id', 'cajero', 'ts',
    'cajero_id', 'apertura', 'cierre', 'estado', 'fondo',
  ])

  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      sanitized[key] = sanitizeValue(value)
    }
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
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeData(value as Record<string, unknown>)
  }
  return null
}
