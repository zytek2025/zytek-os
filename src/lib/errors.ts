import { ZodError } from 'zod'

export function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export function safeJsonParse(json: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(json) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JSON parse error' }
  }
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown): { status: number; body: { ok: false; error: string; code?: string } } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: { ok: false, error: error.message, code: error.code },
    }
  }
  
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: { ok: false, error: 'Validación fallida', code: 'VALIDATION_ERROR' },
    }
  }
  
  if (error instanceof Error) {
    console.error('[API Error]', error.message)
    return {
      status: 500,
      body: { ok: false, error: 'Error interno del servidor' },
    }
  }
  
  return {
    status: 500,
    body: { ok: false, error: 'Error desconocido' },
  }
}

export function requireAuth(auth: { ok: boolean; tenantId?: string; nivel?: number }, nivelMax?: number) {
  if (!auth.ok || !auth.tenantId) {
    throw new AppError('No autenticado', 401, 'UNAUTHORIZED')
  }
  if (nivelMax !== undefined && auth.nivel !== undefined && auth.nivel > nivelMax) {
    throw new AppError('Nivel de acceso insuficiente', 403, 'FORBIDDEN')
  }
}
