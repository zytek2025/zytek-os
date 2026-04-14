import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { uuidSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerClient()
  const { data } = await db
    .from('turnos')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('estado', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ ok: true, turno: data || null })
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const fondo = typeof body.fondo === 'number' ? body.fondo : 0
    
    if (fondo < 0) {
      return NextResponse.json({ ok: false, error: 'Fondo no puede ser negativo' }, { status: 400 })
    }

    const db = getServerClient()
    const { data, error } = await db
      .from('turnos')
      .insert({
        tenant_id: auth.tenantId,
        cajero_id: auth.userId || null,
        cajero: auth.nombre || null,
        fondo,
        estado: 'activo',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, turno: data })
  } catch (e: any) {
    logSecurityEvent('TURNO_CREATE_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { turnoId, estado } = body

    if (!turnoId) {
      return NextResponse.json({ ok: false, error: 'turnoId requerido' }, { status: 400 })
    }

    const validStates = ['cerrado_x', 'cerrado_z']
    if (estado && !validStates.includes(estado)) {
      return NextResponse.json({ ok: false, error: 'Estado inválido' }, { status: 400 })
    }

    const db = getServerClient()
    const { error } = await db
      .from('turnos')
      .update({ estado: estado || 'cerrado_x', cierre: new Date().toISOString() })
      .eq('id', turnoId)
      .eq('tenant_id', auth.tenantId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    logSecurityEvent('TURNO_UPDATE_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
