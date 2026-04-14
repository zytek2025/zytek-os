import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { clienteSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerClient()
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('nombre')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const cliente = clienteSchema.parse(body)
    const db = getServerClient()

    const insertData: Record<string, unknown> = {
      tenant_id: auth.tenantId,
      nombre: cliente.nombre,
      tel: cliente.tel || null,
      email: cliente.email || null,
      visitas: cliente.visitas,
      gasto: cliente.gasto,
      cxc: cliente.cxc,
      adelanto: cliente.adelanto,
      puntos: cliente.puntos,
      nivel: cliente.nivel,
      tipo: cliente.tipo,
      estado: cliente.estado,
    }

    if (cliente.id) {
      const { data: existing } = await db
        .from('clientes')
        .select('id')
        .eq('id', cliente.id)
        .eq('tenant_id', auth.tenantId)
        .single()
      
      if (existing) {
        const { data, error } = await db
          .from('clientes')
          .update(insertData)
          .eq('id', cliente.id)
          .eq('tenant_id', auth.tenantId)
          .select()
          .single()
        
        if (error) throw new Error(error.message)
        return NextResponse.json({ ok: true, data })
      }
    }

    const { data, error } = await db
      .from('clientes')
      .insert(insertData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Datos de cliente inválidos', details: e.errors }, { status: 400 })
    }
    logSecurityEvent('CLIENTE_INSERT_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
