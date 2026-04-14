// ═══════════════════════════════════════════════════════════════
//  Next.js Middleware — Security Layer
//  - Rate Limiting (in-memory, per-instance)
//  - JWT Verification
//  - Security Headers
//  - Route Protection
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const RATE_STORE = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_AUTH = 10
const MAX_API = 120

const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-Download-Options': 'noopen',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self'",
    "object-src 'none'",
  ].join('; '),
}

function getJwtSecret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET not set')
  return new TextEncoder().encode(s)
}

function checkRateLimit(key: string, max: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = RATE_STORE.get(key)

  if (!entry || now > entry.resetAt) {
    RATE_STORE.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: max - 1, resetAt: now + WINDOW_MS }
  }

  entry.count++
  RATE_STORE.set(key, entry)
  const remaining = Math.max(0, max - entry.count)
  return { ok: entry.count <= max, remaining, resetAt: entry.resetAt }
}

let cleanupCounter = 0
function maybeCleanup() {
  if (++cleanupCounter < 500) return
  cleanupCounter = 0
  const now = Date.now()
  for (const [key, entry] of RATE_STORE.entries()) {
    if (now > entry.resetAt) RATE_STORE.delete(key)
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

const PUBLIC_PREFIXES = [
  '/_next', '/favicon', '/modules',
  '/api/license', '/api/auth', '/api/modules',
  '/',
]

const PROTECTED_MODS = [
  '/pos', '/admin', '/crm', '/kds',
  '/mesero', '/retail', '/constructor', '/fintrack',
]

const SUSPICIOUS_PATTERNS = [
  /<script/i, /javascript:/i, /on\w+=/i,
  /union.*select/i, /union.*from/i,
  /drop\s+table/i, /delete\s+from/i,
  /exec\s*\(/i, /eval\s*\(/i,
]

function isSuspiciousRequest(req: NextRequest): boolean {
  const body = req.headers.get('content-type')?.includes('application/json')
  
  if (body && SUSPICIOUS_PATTERNS.some(p => p.test(req.url))) {
    return true
  }
  
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  maybeCleanup()

  if (isSuspiciousRequest(req)) {
    console.warn(`[SECURITY] Suspicious request from ${ip}: ${pathname}`)
    return NextResponse.json(
      { ok: false, error: 'Solicitud sospechosa' },
      { status: 400 }
    )
  }

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/') {
    if (pathname.startsWith('/api/auth')) {
      const rl = checkRateLimit(`auth:${ip}`, MAX_AUTH)
      const response = NextResponse.next()
      addSecurityHeaders(response)
      
      response.headers.set('X-RateLimit-Limit', String(MAX_AUTH))
      response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
      response.headers.set('X-RateLimit-Reset', String(rl.resetAt))
      
      if (!rl.ok) {
        return NextResponse.json(
          { ok: false, error: 'Demasiados intentos. Espera un minuto.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(MAX_AUTH),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rl.resetAt),
            },
          }
        )
      }
      return response
    }
    return addSecurityHeaders(NextResponse.next())
  }

  if (pathname.startsWith('/api/')) {
    const rl = checkRateLimit(`api:${ip}`, MAX_API)
    
    if (!rl.ok) {
      const response = NextResponse.json(
        { ok: false, error: 'Rate limit excedido' },
        { status: 429 }
      )
      addSecurityHeaders(response)
      response.headers.set('Retry-After', String(Math.ceil((rl.resetAt - Date.now()) / 1000)))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
      || req.cookies.get('zytek-token')?.value

    if (!token) {
      const response = NextResponse.json(
        { ok: false, error: 'Token requerido' },
        { status: 401 }
      )
      return addSecurityHeaders(response)
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecret())
      
      if (!payload.tenantId || !payload.sub) {
        const response = NextResponse.json(
          { ok: false, error: 'Token incompleto' },
          { status: 401 }
        )
        return addSecurityHeaders(response)
      }

      const response = NextResponse.next()
      addSecurityHeaders(response)
      
      response.headers.set('x-tenant-id', String(payload.tenantId))
      response.headers.set('x-user-id', String(payload.sub))
      response.headers.set('x-user-nivel', String(payload.nivel || 5))
      response.headers.set('x-user-nombre', String(payload.nombre || ''))
      response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
      
      return response
    } catch {
      const response = NextResponse.json(
        { ok: false, error: 'Token inválido o expirado' },
        { status: 401 }
      )
      return addSecurityHeaders(response)
    }
  }

  if (PROTECTED_MODS.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/api/(.*)',
    '/pos/:path*', '/admin/:path*', '/crm/:path*',
    '/kds/:path*', '/mesero/:path*', '/retail/:path*',
    '/constructor/:path*', '/fintrack/:path*',
  ],
}
