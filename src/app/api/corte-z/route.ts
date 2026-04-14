import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { corteZSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    if (!body.snapshot || !body.checksumLocal) {
      return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 })
    }

    const snapshot = corteZSchema.parse(body.snapshot)
    const { checksumLocal } = body
    
    if (typeof checksumLocal !== 'string' || checksumLocal.length > 100) {
      return NextResponse.json({ ok: false, error: 'Checksum inválido' }, { status: 400 })
    }

    const db = getServerClient()

    const { data: ventas } = await db
      .from('ventas')
      .select('id, total, ts')
      .eq('tenant_id', auth.tenantId)
      .eq('turno_id', snapshot.turnoId)
      .order('id')

    const sortedIds = (ventas || []).map(v => v.id).sort().join(',')
    const checksumServer = simpleHash(sortedIds + snapshot.turnoId)
    const validado = checksumServer === checksumLocal

    const { error } = await db.from('cortes_z').insert({
      tenant_id: auth.tenantId,
      turno_id: snapshot.turnoId,
      cajero: snapshot.cajero || auth.nombre || null,
      apertura: snapshot.apertura || null,
      cierre: snapshot.cierre || new Date().toISOString(),
      total_ventas: snapshot.totalVentas,
      total_bs: snapshot.totalBs || null,
      total_tickets: snapshot.totalTickets,
      formas_pago: snapshot.formasPago || [],
      iva: snapshot.iva,
      igtf: snapshot.igtf,
      tasa: snapshot.tasa || null,
      checksum: checksumLocal,
      checksum_nube: checksumServer,
      validado,
      sincronizado: true,
      tx_count: (ventas || []).length,
      created_at: new Date().toISOString(),
    })

    if (error) throw new Error(error.message)

    if (!validado) {
      logSecurityEvent(
        'CORTE_Z_CHECKSUM_MISMATCH',
        `local=${checksumLocal}, server=${checksumServer}, turno=${snapshot.turnoId}`,
        auth.tenantId,
        auth.userId
      )
      
      await db.from('audit_log').insert({
        tenant_id: auth.tenantId,
        evento: 'corte_z_checksum_mismatch',
        detalle: JSON.stringify({ checksumLocal, checksumServer, turnoId: snapshot.turnoId }),
        user_name: snapshot.cajero || auth.nombre,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      ok: validado,
      checksumServer,
      validado,
      reason: validado ? null : 'checksum_mismatch',
    })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Datos de corte inválidos', details: e.errors }, { status: 400 })
    }
    logSecurityEvent('CORTE_Z_ERROR', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

function simpleHash(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
