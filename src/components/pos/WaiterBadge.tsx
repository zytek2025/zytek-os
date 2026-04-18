'use client'
import { getInitials, getAvatarColor } from '@/lib/utils/avatar'

interface WaiterBadgeProps {
  name: string
  size?: 'sm' | 'md'
}

const SIZES = {
  sm: { box: 24, font: 10 },
  md: { box: 32, font: 13 },
}

export function WaiterBadge({ name, size = 'sm' }: WaiterBadgeProps) {
  const s = SIZES[size]
  return (
    <div
      title={name}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: '50%',
        background: getAvatarColor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: s.font,
        fontWeight: 700,
        fontFamily: 'DM Sans, sans-serif',
        color: '#0a0a0f',
        flexShrink: 0,
        letterSpacing: -0.5,
      }}
    >
      {getInitials(name)}
    </div>
  )
}
