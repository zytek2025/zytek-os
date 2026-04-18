'use client'
import { useConnectionStatus, type ConnectionStatus } from '@/hooks/useConnectionStatus'

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  online:   { color: '#5DCAA5', label: 'Online' },
  degraded: { color: '#EF9F27', label: 'Lento' },
  offline:  { color: '#F09595', label: 'Offline' },
  syncing:  { color: '#85B7EB', label: 'Sync' },
}

export function ConnectionIndicator() {
  const { status, pendingOps } = useConnectionStatus()
  const cfg = STATUS_CONFIG[status]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color,
        animation: status !== 'online' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        boxShadow: `0 0 4px ${cfg.color}`,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 600,
        fontFamily: 'DM Mono, monospace',
        color: cfg.color,
      }}>
        {cfg.label}
      </span>
      {pendingOps > 0 && (
        <span style={{
          fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700,
          color: '#fff', background: '#F09595', borderRadius: 8,
          padding: '1px 5px', lineHeight: '14px',
        }}>
          {pendingOps} pendientes
        </span>
      )}
    </div>
  )
}
