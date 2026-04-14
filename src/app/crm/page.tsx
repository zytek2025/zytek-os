'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { CRMPanel } from '@/components/crm/CRMPanel'
import type { License } from '@/types'

export default function CRMPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="crm" onActivated={setLicense}>
      {license && <CRMPanel license={license} />}
    </LicenseGate>
  )
}
