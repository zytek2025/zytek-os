'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { ConstructorIA } from '@/components/constructor/ConstructorIA'
import type { License } from '@/types'

export default function ConstructorPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="constructor" onActivated={setLicense}>
      {license && <ConstructorIA license={license} />}
    </LicenseGate>
  )
}
