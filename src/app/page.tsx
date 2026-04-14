'use client'
import { useState, useEffect } from 'react'
import { LicenseGate }         from '@/components/shared/LicenseGate'
import { ModuleLauncher }      from '@/components/shared/ModuleLauncher'
import type { License }        from '@/types'

export default function Home() {
  const [license, setLicense] = useState<License | null>(null)

  return (
    <LicenseGate moduleId="shell" onActivated={setLicense}>
      {license && <ModuleLauncher license={license} />}
    </LicenseGate>
  )
}
