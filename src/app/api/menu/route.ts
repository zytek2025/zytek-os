import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase.server'
import { verifyAuth } from '@/lib/auth.server'
import { menuItemSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServerClient()
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('activo', true)
    .order('cat')
    .order('nombre')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  if (auth.nivel !== undefined && auth.nivel > 2) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const item = menuItemSchema.parse(body)
    const db = getServerClient()

    const insertData: Record<string, unknown> = {
      tenant_id: auth.tenantId,
      nombre: item.nombre,
      cat: item.cat || null,
      precio: item.precio,
      precio_matriz: item.precioMatriz || null,
      modificadores: item.modificadores || null,
      receta: item.receta || null,
      activo: item.activo,
      emoji: item.emoji || null,
      descripcion: item.descripcion || null,
      kds_station: item.kdsStation || null,
    }

    if (item.id) {
      insertData.id = item.id
    }

    const { data, error } = item.id
      ? await db.from('menu_items').update(insertData).eq('id', item.id).eq('tenant_id', auth.tenantId).select().single()
      : await db.from('menu_items').insert(insertData).select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'Datos de item inválidos', details: e.errors }, { status: 400 })
    }
    logSecurityEvent('MENU_INSERT_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAuth(req)
  if (!auth.ok || !auth.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  if (auth.nivel !== undefined && auth.nivel > 2) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await req.json()
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 })
    }

    const db = getServerClient()
    const { error } = await db
      .from('menu_items')
      .update({ activo: false })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    logSecurityEvent('MENU_DELETE_FAILED', e.message, auth.tenantId, auth.userId)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
