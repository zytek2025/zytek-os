'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import POSRestaurant from '@/components/pos/POSRestaurant'
import type { License } from '@/types'

export default function POSPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="pos" onActivated={setLicense}>
      {license && <POSRestaurant license={license} />}
    </LicenseGate>
  )
}
