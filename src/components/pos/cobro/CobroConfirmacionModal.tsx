'use client'

import { useEffect } from 'react'
import type { CobroResultado } from '@/lib/payment/types'

export interface CobroConfirmacionModalProps {
  resultado: CobroResultado
  mesa?: string | null
  onClose: () => void
  onImprimirTicket?: () => void
}

const BG_OVERLAY = 'rgba(0,0,0,0.75)'
const BG_MODAL = '#1a1a22'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#e6e6ea'
const TEXT_DIM = '#8a8a95'
const SUCCESS = '#5DCAA5'
const ACCENT = '#ff7c20'

export function CobroConfirmacionModal({
  resultado,
  mesa,
  onClose,
  onImprimirTicket,
}: CobroConfirmacionModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        onClose()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: BG_OVERLAY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: BG_MODAL,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 32,
          minWidth: 420,
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
        <div
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 22,
            fontWeight: 700,
            color: SUCCESS,
            marginBottom: 4,
          }}
        >
          Cobro procesado
        </div>
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 11,
            color: TEXT_DIM,
            marginBottom: 24,
          }}
        >
          Comanda {resultado.numeroComanda ?? resultado.orderId.slice(0, 8)}
          {mesa ? ` · Mesa ${mesa}` : ''}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: `1px solid ${BORDER}`,
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 20,
          }}
        >
          <span style={{ color: TEXT_DIM, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
            Total cobrado
          </span>
          <span
            style={{
              color: TEXT,
              fontFamily: 'DM Mono, monospace',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ${resultado.totalCobrado.toFixed(2)}
          </span>
        </div>

        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: TEXT_DIM, marginBottom: 20 }}>
          {resultado.movimientoIds.length} movimiento{resultado.movimientoIds.length === 1 ? '' : 's'} registrado{resultado.movimientoIds.length === 1 ? '' : 's'} en FinTrack
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {onImprimirTicket && (
            <button
              onClick={onImprimirTicket}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Imprimir ticket
            </button>
          )}
          <button
            onClick={onClose}
            autoFocus
            style={{
              padding: '12px 32px',
              background: ACCENT,
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Listo (Enter)
          </button>
        </div>
      </div>
    </div>
  )
}
