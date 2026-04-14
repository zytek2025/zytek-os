'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Admin > Configuración del POS
// Match: sec-pos (líneas 2573-2617)
// Modo de operación · Mesas · Numeración · To Go
// Ambientes & Mesas · Estaciones KDS · Turnos · Impresoras
// Archivo: src/components/admin/sections/ConfigPOSSec.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { SectionProps } from './types'
import { getSharedStyles, createSbFetch } from './types'

type PosTab = 'mesas' | 'kds' | 'turnos' | 'impresoras'
type PosMode = 'restaurant' | 'streetfood' | 'combinado'

export function ConfigPOSSec({ session, supabaseUrl, supabaseKey, colors: c, showToast }: SectionProps) {
  const S = getSharedStyles(c)
  const sbFetch = createSbFetch(supabaseUrl, supabaseKey)

  const [posTab, setPosTab] = useState<PosTab>('mesas')
  const [mode, setMode] = useState<PosMode>('streetfood')
  const [mesasHabilitadas, setMesasHabilitadas] = useState(false)
  const [maxMesas, setMaxMesas] = useState(10)
  const [prefijo, setPrefijo] = useState('A')
  const [toGo, setToGo] = useState(true)
  const [quickN, setQuickN] = useState(10)

  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <div style={S.sw(on)} onClick={onClick}><div style={S.swDot(on)} /></div>
  )

  const saveConfig = async () => {
    try {
      // TODO: guardar en tenant_config
      showToast('Configuración del POS guardada')
    } catch (e) { showToast('Error guardando', 'error') }
  }

  return (
    <div>
      <div style={S.pageTitle}>Configuración del Punto de Venta</div>
      <div style={S.pageSub}>Modo de operación · Ambientes · Mesas · Estaciones KDS · Turnos</div>

      {/* ── Modo de operación ── */}
      <div style={S.card}>
        <div style={S.cardHead}><div style={S.cardTitle}>Modo de Operación</div></div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {([
            { id: 'restaurant' as PosMode, label: 'Restaurant', desc: 'Mesas + ambientes + meseros', icon: '🍽️' },
            { id: 'streetfood' as PosMode, label: 'Street Food', desc: 'Pedidos numerados, sin mesas', icon: '🛒' },
            { id: 'combinado' as PosMode, label: 'Combinado', desc: 'Mesas + pedidos numerados', icon: '🏪' },
          ]).map(m => (
            <div key={m.id} onClick={() => setMode(m.id)} style={{
              padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.13s',
              background: mode === m.id ? c.orangeDim : c.surface2,
              border: `2px solid ${mode === m.id ? c.orange : c.border}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: mode === m.id ? c.orange : c.text }}>{m.label}</div>
              <div style={{ fontSize: 10, color: c.textDim, marginTop: 4 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mesas toggle ── */}
      <div style={S.card}>
        <div style={{ ...S.cardHead }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div><div style={S.cardTitle}>Mesas</div><div style={S.cardSub}>Habilitar si el local tiene mesas</div></div>
            <div style={{ marginLeft: 'auto' }}><Switch on={mesasHabilitadas} onClick={() => setMesasHabilitadas(!mesasHabilitadas)} /></div>
          </div>
        </div>
      </div>

      {/* ── Numeración de pedidos ── */}
      <div style={S.card}>
        <div style={S.cardHead}><div style={S.cardTitle}>Numeración de Pedidos</div></div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={S.fgroup}>
            <label style={S.flabel}>PREFIJO</label>
            <input type="text" maxLength={3} value={prefijo} onChange={e => setPrefijo(e.target.value.toUpperCase())} style={S.finput} />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>EJEMPLO</label>
            <div style={{ ...S.finput, background: 'transparent', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: c.orange, fontSize: 16, display: 'flex', alignItems: 'center' }}>
              {prefijo}-001
            </div>
          </div>
        </div>
      </div>

      {/* ── To Go ── */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div><div style={S.cardTitle}>🥡 Pedidos Para Llevar (To Go)</div><div style={S.cardSub}>Permite marcar pedidos como para llevar</div></div>
            <div style={{ marginLeft: 'auto' }}><Switch on={toGo} onClick={() => setToGo(!toGo)} /></div>
          </div>
        </div>
      </div>

      {/* ── Tabs avanzados — match líneas 2578-2583 ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${c.border}`, marginBottom: 14, marginTop: 20 }}>
        {([
          { id: 'mesas' as PosTab, label: '🗺️ Ambientes & Mesas' },
          { id: 'kds' as PosTab, label: '🖥️ Estaciones KDS' },
          { id: 'turnos' as PosTab, label: '🕐 Turnos & Caja' },
          { id: 'impresoras' as PosTab, label: '🖨️ Impresoras' },
        ]).map(t => (
          <div key={t.id} onClick={() => setPosTab(t.id)} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: posTab === t.id ? c.orange : c.textDim,
            borderBottom: `2px solid ${posTab === t.id ? c.orange : 'transparent'}`, transition: 'all 0.13s',
          }}>{t.label}</div>
        ))}
      </div>

      {/* ── Tab: Ambientes & Mesas — match líneas 2586-2617 ── */}
      {posTab === 'mesas' && (
        <>
          <div style={S.card}>
            <div style={S.cardHead}>
              <div><div style={S.cardTitle}>Ambientes</div><div style={S.cardSub}>Salón, terraza, barra, VIP...</div></div>
              <button style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nuevo ambiente</button>
            </div>
            <div style={{ padding: '10px 14px', color: c.textDim, fontSize: 11, fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
              Sin ambientes · crea el primero
            </div>
          </div>

          {mesasHabilitadas && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <div><div style={S.cardTitle}>Mesas</div><div style={S.cardSub}>{maxMesas} mesas configuradas</div></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>Generar</span>
                    <input type="number" min="1" max="100" value={quickN} onChange={e => setQuickN(parseInt(e.target.value) || 1)} style={{ width: 50, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, padding: '3px 6px', color: c.orange, fontFamily: "'DM Mono', monospace", fontSize: 13, textAlign: 'center', outline: 'none' }} />
                    <span style={{ fontSize: 10, color: c.textDim, fontFamily: "'DM Mono', monospace" }}>mesas</span>
                    <button onClick={() => { setMaxMesas(quickN); showToast(`${quickN} mesas creadas`) }} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>⚡ Crear</button>
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={S.th}>ID</th><th style={S.th}>Capacidad</th><th style={S.th}>Tipo</th><th style={S.th}>Activa</th></tr></thead>
                  <tbody>
                    {Array.from({ length: Math.min(maxMesas, 20) }, (_, i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, fontWeight: 700, color: c.orange, fontFamily: "'DM Mono', monospace" }}>Mesa {i + 1}</td>
                        <td style={{ ...S.td, fontFamily: "'DM Mono', monospace" }}>4</td>
                        <td style={S.td}><span style={S.badge(c.surface2, c.textDim, c.border)}>Standard</span></td>
                        <td style={S.td}><Switch on={true} onClick={() => {}} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: KDS ── */}
      {posTab === 'kds' && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div><div style={S.cardTitle}>Estaciones KDS</div><div style={S.cardSub}>Pantallas de cocina conectadas</div></div>
            <button style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nueva estación</button>
          </div>
          <div style={{ padding: 30, textAlign: 'center', color: c.textDim, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
            Sin estaciones KDS · configura la primera
          </div>
        </div>
      )}

      {/* ── Tab: Turnos ── */}
      {posTab === 'turnos' && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div><div style={S.cardTitle}>Turnos & Caja</div><div style={S.cardSub}>Apertura y cierre de turnos</div></div>
          </div>
          <div style={{ padding: 14 }}>
            {([
              { name: 'Apertura automática al primer login', desc: 'El turno se abre al entrar un cajero', on: true },
              { name: 'Cierre automático a media noche', desc: 'Genera corte Z a las 00:00', on: false },
              { name: 'Requiere conteo de efectivo al cerrar', desc: 'El cajero debe ingresar el monto real', on: true },
            ]).map((cfg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{cfg.name}</div><div style={{ fontSize: 10, color: c.textDim, marginTop: 2 }}>{cfg.desc}</div></div>
                <Switch on={cfg.on} onClick={() => {}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Impresoras ── */}
      {posTab === 'impresoras' && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div><div style={S.cardTitle}>Impresoras</div><div style={S.cardSub}>Impresoras de tickets y comandas</div></div>
            <button style={{ ...S.btn, ...S.btnPrimary, ...S.btnSm }}>+ Nueva impresora</button>
          </div>
          <div style={{ padding: 30, textAlign: 'center', color: c.textDim, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
            Sin impresoras configuradas
          </div>
        </div>
      )}

      {/* Botón guardar global */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={saveConfig} style={{ ...S.btn, ...S.btnPrimary, padding: '12px 28px', fontSize: 14 }}>💾 Guardar Configuración</button>
      </div>
    </div>
  )
}
