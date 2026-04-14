import { NextRequest, NextResponse } from 'next/server'
import { validateLicense, canUseModule } from '@/lib/license.server'
import { licenseValidationSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/lib/api-helpers'
import type { ModuleId } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = licenseValidationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        reason: 'invalid_request',
        errors: validation.error.errors,
      }, { status: 400 })
    }

    const { key, moduleId } = validation.data

    const result = await validateLicense(key)
    if (!result.ok) {
      logSecurityEvent('LICENSE_VALIDATION_FAILED', result.reason || 'unknown', undefined, undefined)
      return NextResponse.json(result, { status: 401 })
    }

    if (moduleId && !canUseModule(result.license!, moduleId as ModuleId)) {
      return NextResponse.json({
        ok: false,
        reason: 'module_not_allowed',
        detail: `El módulo "${moduleId}" no está incluido en el plan "${result.license!.plan}"`,
      }, { status: 403 })
    }

    return NextResponse.json({
      ok: true,
      license: {
        tenantName: result.license!.tenantName,
        plan: result.license!.plan,
        modules: result.license!.modules,
        expiresAt: result.license!.expiresAt,
        maxUsers: result.license!.maxUsers,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    logSecurityEvent('LICENSE_ERROR', msg)
    console.error('[/api/license]', msg)
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 })
  }
}
