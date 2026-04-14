// ── GET /api/reportes — server-side report data ───────────────
import { NextRequest, NextResponse } from 'next/server'
import { getServerClient }            from '@/lib/supabase.server'
import { verifyAuth }                 from '@/lib/auth.server'

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (auth.nivel! > 3) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const tipo   = searchParams.get('tipo') || 'resumen'
  const desde  = searchParams.get('desde') || new Date().toISOString().slice(0,10)
  const hasta  = searchParams.get('hasta') || new Date().toISOString().slice(0,10)
  const db = getServerClient()

  switch (tipo) {
    case 'ventas_dia': {
      const { data } = await db.from('ventas').select('total, formas_pago, cajero, ts, created_at')
        .eq('tenant_id', auth.tenantId)
        .gte('created_at', desde + 'T00:00:00')
        .lte('created_at', hasta + 'T23:59:59')
        .order('created_at', { ascending: false })
      const total  = (data || []).reduce((s, v) => s + Number(v.total), 0)
      const tickets = data?.length || 0
      return NextResponse.json({ ok: true, data, meta: { total, tickets, promedio: tickets ? total/tickets : 0 } })
    }

    case 'inventario_bajo': {
      const { data } = await db.from('inventario').select('*')
        .eq('tenant_id', auth.tenantId)
        .filter('stock', 'lte', db.from('inventario').select('min'))
      return NextResponse.json({ ok: true, data: data || [] })
    }

    case 'clientes_top': {
      const { data } = await db.from('clientes').select('id, nombre, visitas, gasto, nivel')
        .eq('tenant_id', auth.tenantId)
        .order('gasto', { ascending: false })
        .limit(20)
      return NextResponse.json({ ok: true, data: data || [] })
    }

    case 'cortes_z': {
      const { data } = await db.from('cortes_z').select('*')
        .eq('tenant_id', auth.tenantId)
        .gte('created_at', desde + 'T00:00:00')
        .lte('created_at', hasta + 'T23:59:59')
        .order('created_at', { ascending: false })
      return NextResponse.json({ ok: true, data: data || [] })
    }

    default:
      return NextResponse.json({ ok: false, error: 'Tipo de reporte desconocido' }, { status: 400 })
  }
}
