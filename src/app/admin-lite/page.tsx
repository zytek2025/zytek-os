'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { AdminLite } from '@/components/admin/AdminLite'
import type { License } from '@/types'

export default function AdminLitePage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="admin" onActivated={setLicense}>
      {license && <AdminLite license={license} />}
    </LicenseGate>
  )
}
