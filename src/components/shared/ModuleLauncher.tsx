'use client'
import { useRouter }  from 'next/navigation'
import type { License, ModuleId, Plan } from '@/types'

const MODULES: Array<{ id: ModuleId; name: string; desc: string; plan: Plan; color: string; emoji: string }> = [
  { id:'pos',         name:'POS Restaurante', desc:'Punto de venta · mesas · cobro',   plan:'basic', color:'#2ee87a', emoji:'🍽️' },
  { id:'admin',       name:'Admin ERP',       desc:'ERP completo · 8 módulos · IA',    plan:'pro',   color:'#ff7c20', emoji:'⚙️' },
  { id:'mesero',      name:'POS Mesero',      desc:'App móvil touch-first',            plan:'basic', color:'#00d4ff', emoji:'👨‍🍳' },
  { id:'kds',         name:'KDS Cocina',      desc:'Pantalla cocina · timers',         plan:'basic', color:'#ffc040', emoji:'📺' },
  { id:'crm',         name:'CRM',             desc:'Clientes · CxC · leads',           plan:'pro',   color:'#a855f7', emoji:'👥' },
  { id:'retail',      name:'POS Retail',      desc:'Tiendas · SKU · inventario',       plan:'pro',   color:'#38b6ff', emoji:'🛒' },
  { id:'fintrack',    name:'FinTrack',         desc:'P&L · flujo de caja',             plan:'ent',   color:'#2ee87a', emoji:'📊' },
  { id:'constructor', name:'Constructor IA',  desc:'Multi-agente · genera módulos',   plan:'ent',   color:'#00d4ff', emoji:'🤖' },
]

const PLAN_NAMES: Record<Plan, string> = { basic: 'Básico', pro: 'Pro', ent: 'Enterprise' }

function isModuleAllowed(license: License, moduleId: ModuleId): boolean {
  const mods = license.modules as string[]
  // If modules is ['*'] — allow everything
  if (mods.includes('*')) return true
  // Otherwise check if the specific module is in the list
  return mods.includes(moduleId)
}

export function ModuleLauncher({ license }: { license: License }) {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{
        height: 52, background: '#111114', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, background: '#ff7c20', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 14, color: '#fff',
        }}>Z</div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 13, color: '#f0f0f5' }}>ZytekOS</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#606070', letterSpacing: 2 }}>v2.0</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#606070' }}>
            {license.tenantName}
          </span>
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 9,
            background: 'rgba(56,182,255,0.1)', color: '#38b6ff',
            border: '1px solid rgba(56,182,255,0.25)', padding: '2px 8px', borderRadius: 10,
          }}>
            {PLAN_NAMES[license.plan]}
          </span>
          <button
            onClick={() => { localStorage.removeItem('zytek_license_key'); window.location.reload() }}
            style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#606070', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            salir
          </button>
        </div>
      </div>

      {/* Launcher grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 22, color: '#f0f0f5' }}>
            Bienvenido, {license.tenantName}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#606070', letterSpacing: 3, marginTop: 6 }}>
            SELECCIONA UN MÓDULO
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10, width: '100%', maxWidth: 760,
        }}>
          {MODULES.map(m => {
            const allowed  = isModuleAllowed(license, m.id)
            const disabled = !allowed

            return (
              <div
                key={m.id}
                onClick={() => !disabled && router.push(`/${m.id}`)}
                style={{
                  background: '#16161a',
                  border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: 14,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.35 : 1,
                  transition: 'border-color 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}
                onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = '#ff7c20' }}
                onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ fontSize: 22, marginBottom: 2 }}>{m.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5' }}>{m.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#606070' }}>{m.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: allowed ? m.color : '#404040' }} />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: allowed ? m.color : '#404040' }}>
                    {PLAN_NAMES[m.plan]}
                  </span>
                  {disabled && <span style={{ marginLeft: 'auto', fontSize: 10 }}>🔒</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Show active plan info */}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#404050', marginTop: 8 }}>
          Plan activo: {PLAN_NAMES[license.plan]} · {(license.modules as string[]).includes('*') ? 'Todos los módulos' : `${(license.modules as string[]).length} módulos`}
        </div>
      </div>
    </div>
  )
}
