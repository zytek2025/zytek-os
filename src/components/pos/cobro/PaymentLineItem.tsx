'use client'

import type { PagoLinea } from '@/lib/payment/types'

export interface PaymentLineItemProps {
  pago: PagoLinea
  cuentaNombre?: string
  formaPagoNombre?: string
  onRemove: () => void
}

const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#e6e6ea'
const TEXT_DIM = '#8a8a95'
const DANGER = '#ef4444'

function fmtMonto(monto: number, moneda: string) {
  const simbolo = moneda === 'USD' ? '$' : moneda === 'VES' ? 'Bs ' : `${moneda} `
  return `${simbolo}${monto.toFixed(2)}`
}

export function PaymentLineItem({ pago, cuentaNombre, formaPagoNombre, onRemove }: PaymentLineItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: `1px solid ${BORDER}`,
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: TEXT, fontWeight: 500 }}>
          {formaPagoNombre ?? pago.formaPagoSlug}
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
          {cuentaNombre ?? 'Cuenta sin identificar'}
          {pago.referencia ? ` · Ref: ${pago.referencia}` : ''}
        </div>
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: TEXT, fontWeight: 600 }}>
        {fmtMonto(pago.monto, pago.monedaCodigo)}
      </div>
      <button
        onClick={onRemove}
        title="Eliminar pago"
        style={{
          padding: '4px 8px',
          background: 'transparent',
          color: DANGER,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'DM Mono, monospace',
        }}
      >
        ×
      </button>
    </div>
  )
}
