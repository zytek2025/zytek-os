import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { formatZodErrors, handleApiError, AppError } from './errors'
import { sanitizeString, sanitizeUUID } from './sanitize'

export function withValidation<T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const validated = schema.parse(body)
      return await handler(validated, req)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          ok: false,
          error: 'Validación fallida',
          details: formatZodErrors(error),
        }, { status: 400 })
      }
      const { status, body } = handleApiError(error)
      return NextResponse.json(body, { status })
    }
  }
}

export function withQueryValidation<T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const query: Record<string, string> = {}
      
      for (const [key, value] of searchParams.entries()) {
        query[key] = value
      }
      
      const validated = schema.parse(query)
      return await handler(validated, req)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          ok: false,
          error: 'Parámetros inválidos',
          details: formatZodErrors(error),
        }, { status: 400 })
      }
      const { status, body } = handleApiError(error)
      return NextResponse.json(body, { status })
    }
  }
}

export function withAuth(
  handler: (req: NextRequest, auth: { ok: boolean; userId?: string; nombre?: string; nivel?: number; tenantId?: string }) => Promise<NextResponse>,
  nivelMax?: number
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const auth = {
      ok: true,
      userId: req.headers.get('x-user-id') || undefined,
      nombre: req.headers.get('x-user-nombre') || undefined,
      nivel: parseInt(req.headers.get('x-user-nivel') || '5'),
      tenantId: req.headers.get('x-tenant-id') || undefined,
    }

    if (!auth.ok || !auth.tenantId) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }

    if (nivelMax !== undefined && auth.nivel !== undefined && auth.nivel > nivelMax) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
    }

    return await handler(req, auth)
  }
}

export function withAuthAndValidation<T extends z.ZodSchema>(
  bodySchema: T,
  handler: (data: z.infer<T>, req: NextRequest, auth: { userId: string; nombre: string; nivel: number; tenantId: string }) => Promise<NextResponse>,
  nivelMax?: number
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const auth = {
      userId: req.headers.get('x-user-id') || '',
      nombre: req.headers.get('x-user-nombre') || '',
      nivel: parseInt(req.headers.get('x-user-nivel') || '5'),
      tenantId: req.headers.get('x-tenant-id') || '',
    }

    if (!auth.userId || !auth.tenantId) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }

    if (nivelMax !== undefined && auth.nivel > nivelMax) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
    }

    try {
      const body = await req.json()
      const validated = bodySchema.parse(body)
      return await handler(validated, req, auth)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          ok: false,
          error: 'Validación fallida',
          details: formatZodErrors(error),
        }, { status: 400 })
      }
      const { status, body } = handleApiError(error)
      return NextResponse.json(body, { status })
    }
  }
}

export function logSecurityEvent(
  event: string,
  details: string,
  tenantId?: string,
  userId?: string
) {
  const timestamp = new Date().toISOString()
  console.warn(`[SECURITY] ${timestamp} | event=${event} | tenant=${tenantId || 'unknown'} | user=${userId || 'anonymous'} | ${details}`)
}
