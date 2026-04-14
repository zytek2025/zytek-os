'use client'
import { useState } from 'react'
import { LicenseGate } from '@/components/shared/LicenseGate'
import { Mesero } from '@/components/mesero/Mesero'
import type { License } from '@/types'

export default function MeseroPage() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="mesero" onActivated={setLicense}>
      {license && <Mesero license={license} />}
    </LicenseGate>
  )
}
