'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { POSLite } from '@/components/pos/POSLite'
import type { License } from '@/types'

export default function POSLitePage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="pos" onActivated={setLicense}>
      {license && <POSLite license={license} />}
    </LicenseGate>
  )
}
