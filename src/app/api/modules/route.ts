// ── GET /api/modules — catálogo + check de plan ───────────────
import { NextRequest, NextResponse } from 'next/server'
import { validateLicense, canUseModule } from '@/lib/license.server'
import type { ModuleId } from '@/types'

const CATALOG = [
  { id:'pos',         name:'POS Restaurante', plan:'basic', desc:'Punto de venta · mesas · cobro' },
  { id:'mesero',      name:'POS Mesero',      plan:'basic', desc:'App móvil touch-first' },
  { id:'kds',         name:'KDS Cocina',      plan:'basic', desc:'Pantalla cocina · estaciones · timers' },
  { id:'admin',       name:'Admin ERP',       plan:'pro',   desc:'ERP completo · 8 módulos · 48 reportes' },
  { id:'crm',         name:'CRM',             plan:'pro',   desc:'Clientes · CxC · leads · fidelización' },
  { id:'retail',      name:'POS Retail',      plan:'pro',   desc:'Tiendas · SKU · inventario' },
  { id:'fintrack',    name:'FinTrack',         plan:'ent',   desc:'P&L · flujo de caja · gastos' },
  { id:'constructor', name:'Constructor IA',  plan:'ent',   desc:'Multi-agente · genera módulos' },
]

export async function POST(req: NextRequest) {
  const { key } = await req.json()
  if (!key) return NextResponse.json({ ok: false, error: 'No key' }, { status: 400 })

  const result = await validateLicense(key)
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 401 })

  const modules = CATALOG.map(m => ({
    ...m,
    allowed: canUseModule(result.license!, m.id as ModuleId)
  }))

  return NextResponse.json({ ok: true, modules, plan: result.license!.plan })
}
