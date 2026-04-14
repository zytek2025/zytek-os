'use client'
import { useEffect, useState } from 'react'

interface FlashMessage { id: string; msg: string; color?: string }

let _addFlash: ((msg: string, color?: string) => void) | null = null

export function flash(msg: string, color?: string) {
  _addFlash?.(msg, color)
}

export function FlashProvider() {
  const [messages, setMessages] = useState<FlashMessage[]>([])

  useEffect(() => {
    _addFlash = (msg, color) => {
      const id = Date.now().toString()
      setMessages(prev => [...prev, { id, msg, color: color || '#2ee87a' }])
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 2800)
    }
    return () => { _addFlash = null }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {messages.map(m => (
        <div key={m.id}
          className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold text-white shadow-lg animate-fade-in"
          style={{ background: m.color }}>
          {m.msg}
        </div>
      ))}
    </div>
  )
}
