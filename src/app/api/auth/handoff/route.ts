import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// POST /api/auth/handoff
// Recibe el handoff token generado por zytek.app/api/handoff,
// lo verifica y establece la sesión en zytek-os guardando la licencia en cookie

function getSecret(): Uint8Array {
  const s = process.env.HANDOFF_SECRET || process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('HANDOFF_SECRET not configured')
  return new TextEncoder().encode(s)
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 })
    }

    // Verificar y decodificar el handoff token (emitido por zytek.app)
    const { payload } = await jwtVerify(token, getSecret())

    const tenantId   = payload.tenantId   as string
    const tenantName = payload.tenantName as string
    const modules    = payload.modules    as string[]
    const plan       = payload.plan       as string
    const userId     = payload.sub        as string

    if (!tenantId || !modules) {
      return NextResponse.json({ ok: false, error: 'Token incompleto' }, { status: 401 })
    }

    // Construir objeto de sesión para zytek-os
    const session = {
      userId,
      tenantId,
      tenantName,
      modules,
      plan,
      issuedAt: Date.now(),
    }

    const sessionStr = Buffer.from(JSON.stringify(session)).toString('base64')

    const response = NextResponse.json({ ok: true })

    // Guardar sesión en cookie httpOnly (válida 8 horas)
    response.cookies.set('zytek-session', sessionStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'

    // Token expirado es el error más común (caduca a los 60s)
    if (msg.includes('expired') || msg.includes('JWTExpired')) {
      return NextResponse.json(
        { ok: false, error: 'El enlace de acceso expiró. Vuelve a zytek.app y presiona "Launch ERP" de nuevo.' },
        { status: 401 }
      )
    }

    console.error('[/api/auth/handoff]', msg)
    return NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 401 })
  }
}
