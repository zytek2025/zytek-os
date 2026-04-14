'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { AdminPanel } from '@/components/admin/AdminPanel'
import type { License } from '@/types'

export default function AdminPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="admin" onActivated={setLicense}>
      {license && <AdminPanel license={license} />}
    </LicenseGate>
  )
}
