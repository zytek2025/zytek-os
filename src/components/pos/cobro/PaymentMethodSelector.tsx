'use client'

import type { FormaPago } from '@/lib/fintrack/types'

export interface PaymentMethodSelectorProps {
  formasPago: FormaPago[]
  selected: string | null
  onSelect: (slug: string) => void
}

const ACCENT = '#ff7c20'
const BORDER = 'rgba(255,255,255,0.08)'
const BG = '#1a1a22'
const TEXT = '#e6e6ea'
const TEXT_DIM = '#8a8a95'

export function PaymentMethodSelector({ formasPago, selected, onSelect }: PaymentMethodSelectorProps) {
  if (formasPago.length === 0) {
    return (
      <div style={{ color: TEXT_DIM, fontFamily: 'DM Mono, monospace', fontSize: 12, padding: 16 }}>
        No hay formas de pago activas. Configurar en FinTrack.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
      {formasPago.map((fp) => {
        const isSelected = selected === fp.slug
        return (
          <button
            key={fp.slug}
            onClick={() => onSelect(fp.slug)}
            style={{
              padding: '14px 10px',
              background: isSelected ? ACCENT : BG,
              color: isSelected ? '#0a0a0f' : TEXT,
              border: `1px solid ${isSelected ? ACCENT : BORDER}`,
              borderRadius: 8,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: isSelected ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 120ms, border 120ms',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 2 }}>{fp.icono ?? '💳'}</div>
            <div>{fp.nombre}</div>
          </button>
        )
      })}
    </div>
  )
}
