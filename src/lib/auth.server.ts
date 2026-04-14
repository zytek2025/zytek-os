// ═══════════════════════════════════════════════════════════════
//  Auth Server Lib — JWT verification
//  Reads from middleware-injected headers when available
//  (faster — no re-verify needed if middleware already verified)
// ═══════════════════════════════════════════════════════════════
import { NextRequest } from 'next/server'
import { jwtVerify }   from 'jose'

export interface AuthResult {
  ok:        boolean
  userId?:   string
  nombre?:   string
  nivel?:    number
  tenantId?: string
}

function getJwtSecret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET not set')
  return new TextEncoder().encode(s)
}

export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  // ── Fast path: read from middleware-injected headers ──────────
  const tenantId = req.headers.get('x-tenant-id')
  const userId   = req.headers.get('x-user-id')
  const nivel    = req.headers.get('x-user-nivel')
  const nombre   = req.headers.get('x-user-nombre')

  if (tenantId && userId) {
    return {
      ok: true,
      userId,
      nombre:   nombre   || '',
      nivel:    parseInt(nivel || '5'),
      tenantId,
    }
  }

  // ── Slow path: verify JWT directly (when bypassing middleware) ─
  const header = req.headers.get('authorization')
  const token  = header?.replace('Bearer ', '') || req.cookies.get('zytek-token')?.value

  if (!token) return { ok: false }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return {
      ok:       true,
      userId:   payload.sub                as string,
      nombre:   payload.nombre             as string,
      nivel:    payload.nivel              as number,
      tenantId: payload.tenantId           as string,
    }
  } catch {
    return { ok: false }
  }
}
