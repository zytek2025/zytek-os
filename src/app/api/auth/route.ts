import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServerClient } from '@/lib/supabase.server'
import { SignJWT } from 'jose'
import { loginSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'

const DEMO_USERS_HASHED = [
  { id: 'u1', nombre: 'Daniel F.', pin_hash: '$2a$10$K8Z.WqnzYb0uFmDxRJ7.iOqwLfOhEbCAk5YxQjFPNJGiTlFo7mJaK', nivel: 1, rol: 'Super Admin', color: '#ff7c20', activo: true },
  { id: 'u2', nombre: 'Admin', pin_hash: '$2a$10$N5Ub8qW2f4XmDJp0cYhVPuJBa9TmCRv7nK6kL2.WxFqOkrPg3eZ2i', nivel: 2, rol: 'Administrador', color: '#38b6ff', activo: true },
  { id: 'u3', nombre: 'Cajero', pin_hash: '$2a$10$HmR4xKvDcE1pQfA7wYb5JOk9UnTBiGlW3NzMd0Xs6VoP.jCqeL8Fu', nivel: 4, rol: 'Cajero', color: '#2ee87a', activo: true },
  { id: 'u4', nombre: 'Mesero 1', pin_hash: '$2a$10$Tz3YpKnBm9sQeVlFcW4aROdGr8JkMvXh6CiAb1Nu5Pw2Lf0gDj7Ey', nivel: 5, rol: 'Mesero', color: '#a855f7', activo: true },
]

function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  if (secret.length < 32) throw new Error('NEXTAUTH_SECRET must be at least 32 characters')
  return new TextEncoder().encode(secret)
}

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)

  try {
    const body = await req.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: 'Datos inválidos',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { pin, tenantId } = validation.data
    const JWT_SECRET = getJwtSecret()
    const db = getServerClient()
    let users = DEMO_USERS_HASHED

    try {
      const { data, error } = await db
        .from('zytek_users')
        .select('id, nombre, nivel, rol, pin_hash, color, activo')
        .eq('tenant_id', tenantId)
        .eq('activo', true)

      if (!error && data && data.length > 0) {
        users = data
      }
    } catch (_) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { ok: false, error: 'Error de base de datos' },
          { status: 503 }
        )
      }
    }

    let matchedUser: typeof users[0] | null = null
    let bcryptFailure = false

    for (const u of users) {
      const hash = u.pin_hash || ''
      
      if (!hash.startsWith('$2')) {
        console.error(`[/api/auth] SECURITY: user ${u.id} has unhashed PIN`)
        await logAudit(db, tenantId, 'security_unhashed_pin', `user_id:${u.id}`)
        bcryptFailure = true
        continue
      }
      
      const match = await bcrypt.compare(pin, hash)
      if (match) {
        matchedUser = u
        break
      }
    }

    if (!matchedUser) {
      await logAudit(db, tenantId, 'auth_failed', `ip:${ip}, bcrypt_issue:${bcryptFailure}`)
      
      return NextResponse.json(
        { ok: false, error: 'PIN incorrecto' },
        { status: 401 }
      )
    }

    const token = await new SignJWT({
      sub: matchedUser.id,
      nombre: matchedUser.nombre,
      nivel: matchedUser.nivel,
      rol: matchedUser.rol,
      tenantId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .setJti(crypto.randomUUID())
      .sign(JWT_SECRET)

    await logAudit(db, tenantId, 'auth_success', `user:${matchedUser.nombre}`)

    const response = NextResponse.json({
      ok: true,
      user: {
        id: matchedUser.id,
        nombre: matchedUser.nombre,
        nivel: matchedUser.nivel,
        rol: matchedUser.rol,
        color: matchedUser.color || '#ff7c20',
      },
      token,
    })

    response.cookies.set('zytek-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    
    if (msg.includes('NEXTAUTH_SECRET')) {
      console.error('[/api/auth] CONFIG ERROR:', msg)
      return NextResponse.json(
        { ok: false, error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }
    
    console.error('[/api/auth]', msg)
    return NextResponse.json(
      { ok: false, error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

async function logAudit(db: any, tenantId: string, evento: string, detalle: string) {
  try {
    await db.from('audit_log').insert({
      tenant_id: tenantId || null,
      evento,
      detalle,
      created_at: new Date().toISOString(),
    })
  } catch (_) { /* non-critical */ }
}
