'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { KDS } from '@/components/kds/KDS'
import type { License } from '@/types'

export default function KDSPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="kds" onActivated={setLicense}>
      {license && <KDS license={license} />}
    </LicenseGate>
  )
}
