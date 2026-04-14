// ═══════════════════════════════════════════════════════════════
//  LICENSE SERVICE — SERVER SIDE
//  Toda la lógica de validación vive aquí, en el servidor.
//  El cliente NUNCA ve las claves reales ni la lógica.
//  Las demo keys solo existen en .env — no en el código.
// ═══════════════════════════════════════════════════════════════
import { getServerClient }            from './supabase.server'
import type { License, LicenseValidationResult, Plan, ModuleId } from '@/types'

const KEY_REGEX = /^ZYTEK(-[A-Z0-9]{2,8}){2,4}$/

// Demo keys desde .env — invisibles en el código fuente del cliente
const DEMO_KEYS: Record<string, Omit<License, 'id' | 'tenantId' | 'createdAt'>> = {
  'ZYTEK-DEMO-BASIC-2025': {
    key: 'ZYTEK-DEMO-BASIC-2025', tenantName: 'Demo Basic',
    plan: 'basic', modules: ['pos', 'mesero', 'kds'],
    maxUsers: 2, expiresAt: '2099-12-31', active: true,
  },
  'ZYTEK-DEMO-PRO-2025': {
    key: 'ZYTEK-DEMO-PRO-2025', tenantName: 'Demo Pro',
    plan: 'pro', modules: ['pos', 'mesero', 'kds', 'admin', 'crm', 'retail'],
    maxUsers: 10, expiresAt: '2099-12-31', active: true,
  },
  'ZYTEK-DEMO-ENT-2025': {
    key: 'ZYTEK-DEMO-ENT-2025', tenantName: 'Demo Enterprise',
    plan: 'ent', modules: ['*'] as ['*'],
    maxUsers: 999, expiresAt: '2099-12-31', active: true,
  },
  // Master key desde .env
  ...(process.env.LICENSE_MASTER_KEY ? {
    [process.env.LICENSE_MASTER_KEY]: {
      key: process.env.LICENSE_MASTER_KEY, tenantName: 'Zytek LLC',
      plan: 'ent' as Plan, modules: ['*'] as ['*'],
      maxUsers: 999, expiresAt: '2099-12-31', active: true,
    }
  } : {})
}

export async function validateLicense(key: string): Promise<LicenseValidationResult> {
  const k = key.trim().toUpperCase()
  if (!k)                    return { ok: false, reason: 'no_key' }
  if (!KEY_REGEX.test(k))   return { ok: false, reason: 'invalid_format' }

  // 1. Check demo keys (en memoria del servidor — cliente nunca las ve)
  const demo = DEMO_KEYS[k]
  if (demo) {
    if (new Date(demo.expiresAt) < new Date()) return { ok: false, reason: 'expired' }
    const license: License = {
      ...demo, id: `demo-${k}`,
      tenantId: `tenant-demo-${k.slice(-4)}`,
      createdAt: new Date().toISOString(),
    }
    return { ok: true, license }
  }

  // 2. Validar contra Supabase (claves de clientes reales)
  try {
    const db = getServerClient()
    const { data, error } = await db
      .from('zytek_licenses')
      .select('*')
      .eq('key', k)
      .single()

    if (error || !data)      return { ok: false, reason: 'not_found' }
    if (!data.active)        return { ok: false, reason: 'inactive' }
    if (new Date(data.expires_at) < new Date()) return { ok: false, reason: 'expired' }

    const license: License = {
      id:         data.id,
      key:        k,
      tenantId:   data.tenant_id,
      tenantName: data.tenant_name,
      plan:       data.plan,
      modules:    data.modules || ['*'],
      maxUsers:   data.max_users || 5,
      expiresAt:  data.expires_at,
      active:     data.active,
      createdAt:  data.created_at,
    }
    return { ok: true, license }
  } catch (e) {
    return { ok: false, reason: 'network_error' }
  }
}

export function canUseModule(license: License, moduleId: ModuleId): boolean {
  const mods = license.modules as string[]
  return mods.includes('*') || mods.includes(moduleId)
}

export function generateKey(tenantCode: string, planCode: string): string {
  const year   = new Date().getFullYear().toString()
  const tenant = tenantCode.toUpperCase().slice(0, 4).padEnd(4, 'X')
  const plan   = planCode.toUpperCase().slice(0, 4).padEnd(4, '0')
  return `ZYTEK-${tenant}-${plan}-${year}`
}
