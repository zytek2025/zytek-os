import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { inventarioItemSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerClient()
  const { data, error } = await db
    .from('inventario')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('nom')

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
    const item = inventarioItemSchema.parse(body)
    const db = getServerClient()

    const insertData: Record<string, unknown> = {
      tenant_id: auth.tenantId,
      nom: item.nom,
      cat: item.cat || null,
      uni: item.uni,
      stock: item.stock,
      min: item.min,
      costo: item.costo,
      ubicacion_id: item.ubicacionId || null,
    }

    if (item.id) {
      const { data: existing } = await db
        .from('inventario')
        .select('id')
        .eq('id', item.id)
        .eq('tenant_id', auth.tenantId)
        .single()
      
      if (existing) {
        const { data, error } = await db
          .from('inventario')
          .update(insertData)
          .eq('id', item.id)
          .eq('tenant_id', auth.tenantId)
          .select()
          .single()
        
        if (error) throw new Error(error.message)
        return NextResponse.json({ ok: true, data })
      }
    }

    const { data, error } = await db
      .from('inventario')
      .insert(insertData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Datos de inventario inválidos', details: e.errors }, { status: 400 })
    }
    logSecurityEvent('INVENTARIO_INSERT_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
