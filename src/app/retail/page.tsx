'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { RetailPOS } from '@/components/retail/RetailPOS'
import type { License } from '@/types'

export default function RetailPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="retail" onActivated={setLicense}>
      {license && <RetailPOS license={license} />}
    </LicenseGate>
  )
}
