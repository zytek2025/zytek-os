'use client'
import { useState, useEffect } from 'react'
import type { License } from '@/types'

export function useLicense() {
  const [license, setLicense]   = useState<License | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('zytek_license_key')
    if (!saved) { setLoading(false); return }
    fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: saved }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setLicense(d.license) })
      .finally(() => setLoading(false))
  }, [])

  const revoke = () => {
    localStorage.removeItem('zytek_license_key')
    setLicense(null)
  }

  return { license, loading, revoke }
}
