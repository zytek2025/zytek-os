'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase.client'
import { usePayment, type CuentaDisponible } from '@/hooks/usePayment'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { PaymentLineItem } from './PaymentLineItem'
import type { FormaPagoSlug, MonedaCodigo } from '@/lib/fintrack/types'
import type { CobroResultado, PagoLinea } from '@/lib/payment/types'
import { mapearErrorCobro } from '@/lib/payment/service'

export interface OrderParaCobro {
  id: string
  order_number: number
  numero_comanda: string | null
  mesa: string | null
  total: number
  propinas: number | null
  descuento_total: number | null
  notas: string | null
  status: string
}

export interface SplitPaymentPanelProps {
  order: OrderParaCobro
  tenantId: string
  userId: string
  userLevel: number
  onClose: () => void
  onSuccess: (resultado: CobroResultado) => void
}

const BG_OVERLAY = 'rgba(0,0,0,0.8)'
const BG_MODAL = '#1a1a22'
const BG_PANEL = '#0f0f15'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#e6e6ea'
const TEXT_DIM = '#8a8a95'
const ACCENT = '#ff7c20'
const SUCCESS = '#5DCAA5'
const DANGER = '#ef4444'
const DANGER_BG = 'rgba(239,68,68,0.08)'

const PERM_NIVEL_COBRAR = 4
const PERM_NIVEL_APLICAR_DESC = 3
const PERM_NIVEL_ANULAR = 3
const PERM_NIVEL_CERRAR_SIN_COBRAR = 3

function fmtMoney(n: number, moneda: string = 'USD') {
  const simbolo = moneda === 'USD' ? '$' : moneda === 'VES' ? 'Bs ' : `${moneda} `
  return `${simbolo}${n.toFixed(2)}`
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function SplitPaymentPanel({
  order,
  tenantId,
  userId,
  userLevel,
  onClose,
  onSuccess,
}: SplitPaymentPanelProps) {
  const { formasPago, cuentas, loading, error, cuentasDisponibles, procesarCobro } = usePayment(tenantId)

  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [formaSeleccionada, setFormaSeleccionada] = useState<FormaPagoSlug | null>(null)
  const [cuentasDeForma, setCuentasDeForma] = useState<CuentaDisponible[]>([])
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>('')
  const [monto, setMonto] = useState<string>('')
  const [referencia, setReferencia] = useState<string>('')
  const [descuento, setDescuento] = useState<number>(order.descuento_total ?? 0)
  const [propina, setPropina] = useState<number>(order.propinas ?? 0)
  const [procesando, setProcesando] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  useEffect(() => {
    if (!formaSeleccionada) {
      setCuentasDeForma([])
      setCuentaSeleccionada('')
      return
    }
    let cancelled = false
    cuentasDisponibles(formaSeleccionada).then((list) => {
      if (cancelled) return
      setCuentasDeForma(list)
      const def = list.find((c) => c.es_default) ?? list[0]
      setCuentaSeleccionada(def?.cuenta_id ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [formaSeleccionada, cuentasDisponibles])

  const cuentasById = useMemo(() => {
    const m = new Map<string, string>()
    cuentas.forEach((c) => m.set(c.id, c.nombre))
    cuentasDeForma.forEach((c) => m.set(c.cuenta_id, c.cuenta_nombre))
    return m
  }, [cuentas, cuentasDeForma])

  const formasById = useMemo(() => {
    const m = new Map<string, string>()
    formasPago.forEach((fp) => m.set(fp.slug, fp.nombre))
    return m
  }, [formasPago])

  const totalConAjustes = (order.total ?? 0) + (propina ?? 0) - (descuento ?? 0)
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0)
  const pendiente = Math.max(0, totalConAjustes - totalPagado)
  const vuelto = Math.max(0, totalPagado - totalConAjustes)
  const puedeConfirmar = pagos.length > 0 && pendiente < 0.005

  const canAplicarDescuento = userLevel <= PERM_NIVEL_APLICAR_DESC
  const canAnular = userLevel <= PERM_NIVEL_ANULAR
  const canCerrarSinCobrar = userLevel <= PERM_NIVEL_CERRAR_SIN_COBRAR

  const cuentaActual = cuentasDeForma.find((c) => c.cuenta_id === cuentaSeleccionada)
  const monedaActual: MonedaCodigo = (cuentaActual?.cuenta_moneda ?? 'USD') as MonedaCodigo

  const handleAgregarPago = () => {
    setErrorLocal(null)
    const montoNum = parseFloat(monto)
    if (!formaSeleccionada) {
      setErrorLocal('Selecciona una forma de pago')
      return
    }
    if (!cuentaSeleccionada) {
      setErrorLocal('Selecciona una cuenta')
      return
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorLocal('Monto invalido')
      return
    }
    const nuevoPago: PagoLinea = {
      id: uid(),
      formaPagoSlug: formaSeleccionada,
      cuentaId: cuentaSeleccionada,
      monto: montoNum,
      monedaCodigo: monedaActual,
      referencia: referencia || undefined,
    }
    setPagos((prev) => [...prev, nuevoPago])
    setMonto('')
    setReferencia('')
  }

  const handleQuitarUltimo = () => {
    setPagos((prev) => prev.slice(0, -1))
  }

  const handleQuitarPago = (id: string) => {
    setPagos((prev) => prev.filter((p) => p.id !== id))
  }

  const handleDescuento = () => {
    if (!canAplicarDescuento) return
    const v = window.prompt('Descuento total (monto en USD):', descuento.toString())
    if (v === null) return
    const n = parseFloat(v)
    if (isNaN(n) || n < 0) return
    setDescuento(n)
  }

  const handlePropina = () => {
    const v = window.prompt('Propina (monto en USD):', propina.toString())
    if (v === null) return
    const n = parseFloat(v)
    if (isNaN(n) || n < 0) return
    setPropina(n)
  }

  const handlePropinaSugerida = () => {
    const sugerida = Math.round((order.total ?? 0) * 0.1 * 100) / 100
    setPropina(sugerida)
  }

  const handleConfirmar = async () => {
    if (!puedeConfirmar || procesando) return
    setProcesando(true)
    setErrorLocal(null)
    try {
      const resultado = await procesarCobro({
        orderId: order.id,
        tenantId,
        cajeroId: userId,
        pagos: pagos.map(({ id: _id, ...rest }) => rest),
        propina,
        descuento,
        notas: order.notas ?? undefined,
      })
      onSuccess(resultado)
    } catch (e) {
      setErrorLocal(mapearErrorCobro(e))
    } finally {
      setProcesando(false)
    }
  }

  const handleAnular = async () => {
    if (!canAnular) return
    const razon = window.prompt('Razon de anulacion (obligatoria):')
    if (!razon || razon.trim().length < 3) return
    setProcesando(true)
    setErrorLocal(null)
    try {
      const { error: errUpd } = await supabase
        .from('pos_orders')
        .update({
          status: 'cancelled',
          ts_cerrada: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('tenant_id', tenantId)
      if (errUpd) throw errUpd
      await supabase.from('pos_audit_trace').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'anular_comanda',
        entity_type: 'pos_order',
        entity_id: order.id,
        reason: razon,
      })
      onClose()
    } catch (e) {
      setErrorLocal(mapearErrorCobro(e))
    } finally {
      setProcesando(false)
    }
  }

  const handleCerrarSinCobrar = () => {
    if (!canCerrarSinCobrar) return
    // TODO v2: decidir estado final (walkout, guarantee_hold) + flujo de autorizacion
    window.alert('Cerrar sin cobrar: pendiente de implementar en v2 (requiere flujo de autorizacion y seleccion de motivo).')
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        e.preventDefault()
        return
      }
      if (e.key === 'F3') {
        handleConfirmar()
        e.preventDefault()
        return
      }
      if (e.key === 'F4') {
        handleAgregarPago()
        e.preventDefault()
        return
      }
      if (e.key === 'F5' && canAplicarDescuento) {
        handleDescuento()
        e.preventDefault()
        return
      }
      if (e.key === 'F6') {
        handlePropina()
        e.preventDefault()
        return
      }
      if (e.key === 'F7') {
        handlePropinaSugerida()
        e.preventDefault()
        return
      }
      if (e.key === 'F8') {
        handleQuitarUltimo()
        e.preventDefault()
        return
      }
      if (e.key === 'F9' && canAnular) {
        handleAnular()
        e.preventDefault()
        return
      }
      if (e.key === 'F10' && canCerrarSinCobrar) {
        handleCerrarSinCobrar()
        e.preventDefault()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const labelComanda = order.numero_comanda ?? `#${order.order_number}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: BG_OVERLAY,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          flex: 1,
          background: BG_MODAL,
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto auto',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: TEXT }}>
              Comanda {labelComanda}
              {order.mesa ? ` · Mesa ${order.mesa}` : ''}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
              Total {fmtMoney(totalConAjustes)} · Pagado {fmtMoney(totalPagado)} · Pendiente {fmtMoney(pendiente)}
              {vuelto > 0 ? ` · Vuelto ${fmtMoney(vuelto)}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: TEXT_DIM,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Esc Cerrar
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 0, minHeight: 0 }}>
          <div style={{ padding: 20, borderRight: `1px solid ${BORDER}`, overflow: 'auto' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 10 }}>
              Metodos de pago
            </div>
            {loading ? (
              <div style={{ color: TEXT_DIM, fontSize: 12 }}>Cargando formas de pago...</div>
            ) : error ? (
              <div style={{ color: DANGER, fontSize: 12 }}>{error}</div>
            ) : (
              <PaymentMethodSelector
                formasPago={formasPago}
                selected={formaSeleccionada}
                onSelect={(slug) => setFormaSeleccionada(slug as FormaPagoSlug)}
              />
            )}

            {formaSeleccionada && (
              <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 4 }}>
                    Cuenta destino
                  </label>
                  <select
                    value={cuentaSeleccionada}
                    onChange={(e) => setCuentaSeleccionada(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: BG_PANEL,
                      color: TEXT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                    }}
                  >
                    <option value="">— Selecciona cuenta —</option>
                    {cuentasDeForma.map((c) => (
                      <option key={c.cuenta_id} value={c.cuenta_id}>
                        {c.cuenta_nombre} ({c.cuenta_moneda})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 4 }}>
                    Monto ({monedaActual})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: BG_PANEL,
                      color: TEXT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 16,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 4 }}>
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="N° aprobacion, 4 ult. tarjeta..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: BG_PANEL,
                      color: TEXT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                    }}
                  />
                </div>
                <button
                  onClick={handleAgregarPago}
                  style={{
                    padding: '12px',
                    background: ACCENT,
                    color: '#0a0a0f',
                    border: 'none',
                    borderRadius: 8,
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  F4 Agregar pago
                </button>
                {errorLocal && (
                  <div style={{ color: DANGER, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                    {errorLocal}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: 20, background: BG_PANEL, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 10 }}>
              Pagos registrados ({pagos.length})
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {pagos.length === 0 ? (
                <div style={{ color: TEXT_DIM, fontSize: 12, padding: 12 }}>
                  Aun no hay pagos. Selecciona una forma de pago y agrega.
                </div>
              ) : (
                pagos.map((p) => (
                  <PaymentLineItem
                    key={p.id}
                    pago={p}
                    cuentaNombre={cuentasById.get(p.cuentaId)}
                    formaPagoNombre={formasById.get(p.formaPagoSlug)}
                    onRemove={() => handleQuitarPago(p.id)}
                  />
                ))
              )}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: 'grid', gap: 4 }}>
              <Row label="Subtotal" value={fmtMoney(order.total ?? 0)} />
              {propina > 0 && <Row label="Propina" value={fmtMoney(propina)} />}
              {descuento > 0 && <Row label="Descuento" value={`-${fmtMoney(descuento)}`} color={SUCCESS} />}
              <Row label="Total" value={fmtMoney(totalConAjustes)} bold />
              <Row label="Pagado" value={fmtMoney(totalPagado)} />
              <Row
                label={vuelto > 0 ? 'Vuelto' : 'Pendiente'}
                value={fmtMoney(vuelto > 0 ? vuelto : pendiente)}
                color={vuelto > 0 ? SUCCESS : pendiente > 0 ? ACCENT : TEXT}
                bold
              />
            </div>
            {pagos.length > 0 && (
              <button
                onClick={handleQuitarUltimo}
                style={{
                  marginTop: 10,
                  padding: '8px',
                  background: 'transparent',
                  color: TEXT_DIM,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                F8 Quitar ultimo pago
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '12px 24px',
            borderTop: `1px solid ${BORDER}`,
            flexWrap: 'wrap',
          }}
        >
          <FKeyBtn label="F5 Descuento" onClick={handleDescuento} disabled={!canAplicarDescuento} />
          <FKeyBtn label="F6 Propina" onClick={handlePropina} />
          <FKeyBtn label="F7 Propina 10%" onClick={handlePropinaSugerida} />
          <div style={{ flex: 1 }} />
          <FKeyBtn label="F9 Anular" onClick={handleAnular} disabled={!canAnular} danger />
          <FKeyBtn label="F10 Cerrar sin cobrar" onClick={handleCerrarSinCobrar} disabled={!canCerrarSinCobrar} danger />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER}`,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {errorLocal && !procesando && (
            <div style={{ color: DANGER, fontSize: 12, fontFamily: 'DM Mono, monospace', marginRight: 'auto' }}>
              {errorLocal}
            </div>
          )}
          <button
            onClick={onClose}
            disabled={procesando}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              color: TEXT,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              cursor: procesando ? 'not-allowed' : 'pointer',
            }}
          >
            Esc Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!puedeConfirmar || procesando}
            style={{
              padding: '14px 28px',
              background: puedeConfirmar ? SUCCESS : BG_PANEL,
              color: puedeConfirmar ? '#0a0a0f' : TEXT_DIM,
              border: `1px solid ${puedeConfirmar ? SUCCESS : BORDER}`,
              borderRadius: 8,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              cursor: puedeConfirmar && !procesando ? 'pointer' : 'not-allowed',
            }}
          >
            {procesando ? 'Procesando...' : 'F3 Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: color ?? TEXT_DIM }}>{label}</span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: bold ? 16 : 13, color: color ?? TEXT, fontWeight: bold ? 700 : 400 }}>
        {value}
      </span>
    </div>
  )
}

function FKeyBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        background: danger ? DANGER_BG : 'transparent',
        color: disabled ? TEXT_DIM : danger ? DANGER : TEXT,
        border: `1px solid ${danger ? DANGER : BORDER}`,
        borderRadius: 6,
        fontFamily: 'DM Mono, monospace',
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  )
}
