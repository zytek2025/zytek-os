'use client'
import { useState, useCallback } from 'react'
import type { ZytekUser } from '@/types'

interface AuthState {
  user:    ZytekUser | null
  token:   string | null
  loading: boolean
  error:   string | null
}

export function useAuth(tenantId: string) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: false, error: null })

  const login = useCallback(async (pin: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, tenantId }),
      })
      const data = await res.json()
      if (data.ok) {
        setState({ user: data.user, token: data.token, loading: false, error: null })
        sessionStorage.setItem('zytek_token', data.token)
        return true
      } else {
        setState(s => ({ ...s, loading: false, error: 'PIN incorrecto' }))
        return false
      }
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Error de conexión' }))
      return false
    }
  }, [tenantId])

  const logout = useCallback(() => {
    sessionStorage.removeItem('zytek_token')
    setState({ user: null, token: null, loading: false, error: null })
  }, [])

  return { ...state, login, logout }
}
