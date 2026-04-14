import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { ventaSchema } from '@/lib/validation'
import { sanitizeNumeric } from '@/lib/sanitize'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const venta = ventaSchema.parse(body)
    const db = getServerClient()

    const { error: ventaErr } = await db.from('ventas').insert({
      id: venta.id,
      tenant_id: auth.tenantId,
      turno_id: venta.turnoId || null,
      mesa: venta.mesa || null,
      cliente_id: venta.clienteId || null,
      items: venta.items.map(i => ({
        item_id: i.itemId,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio: i.precio,
        observaciones: i.observaciones || null,
      })),
      total: venta.total,
      total_bs: venta.totalBs || null,
      formas_pago: venta.formasPago || [],
      iva: venta.iva,
      igtf: venta.igtf,
      cajero: venta.cajero || auth.nombre || null,
      tipo: venta.tipo,
      ts: venta.ts || Math.floor(Date.now() / 1000),
      created_at: new Date().toISOString(),
    })
    
    if (ventaErr) {
      logSecurityEvent('VENTA_INSERT_FAILED', ventaErr.message, auth.tenantId, auth.userId)
      throw new Error(ventaErr.message)
    }

    if (venta.items?.length) {
      await descontarStock(db, auth.tenantId, venta)
    }

    if (venta.clienteId) {
      await db.rpc('incrementar_cliente', {
        p_tenant_id: auth.tenantId,
        p_cliente_id: venta.clienteId,
        p_gasto: venta.total,
      })
    }

    return NextResponse.json({ ok: true, id: venta.id })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Datos de venta inválidos', details: e.errors }, { status: 400 })
    }
    logSecurityEvent('VENTA_ERROR', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const turnoId = searchParams.get('turnoId')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const db = getServerClient()
  let query = db.from('ventas').select('*').eq('tenant_id', auth.tenantId)
  
  if (turnoId) {
    const safeTurnoId = sanitizeNumeric(turnoId)
    if (safeTurnoId) query = query.eq('turno_id', turnoId)
  }
  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)
  
  query = query.order('created_at', { ascending: false }).limit(500)

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

async function descontarStock(db: any, tenantId: string, venta: any) {
  for (const item of venta.items) {
    const { data: menuItem } = await db
      .from('menu_items')
      .select('receta')
      .eq('id', item.itemId)
      .eq('tenant_id', tenantId)
      .single()
    
    if (!menuItem?.receta?.length) continue
    
    for (const ingrediente of menuItem.receta) {
      await db.rpc('descontar_stock', {
        p_tenant_id: tenantId,
        p_item_id: ingrediente.invId,
        p_cantidad: ingrediente.cantidad * item.cantidad,
        p_ref: `venta:${venta.id}`,
        p_user: venta.cajero || 'system',
      })
    }
  }
}
