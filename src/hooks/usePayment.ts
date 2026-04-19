'use client'

import { useState, useCallback, useEffect } from 'react'
import { fintrack } from '@/lib/fintrack/service'
import { paymentService } from '@/lib/payment/service'
import type { Cuenta, CuentaPorFormaPago, FormaPago, FormaPagoSlug } from '@/lib/fintrack/types'
import type { CobroInput, CobroResultado } from '@/lib/payment/types'

export type CuentaDisponible = CuentaPorFormaPago

export function usePayment(tenantId: string | null) {
  const [formasPago, setFormasPago] = useState<FormaPago[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const [fp, cu] = await Promise.all([
          fintrack.listarFormasPago(tenantId),
          fintrack.listarCuentas(tenantId),
        ])
        setFormasPago(fp)
        setCuentas(cu)
      } catch (e: any) {
        setError(e.message ?? 'Error cargando datos de pago')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [tenantId])

  const cuentasDisponibles = useCallback(
    async (formaPagoSlug: string): Promise<CuentaDisponible[]> => {
      if (!tenantId) return []
      return fintrack.cuentasPorFormaPago(tenantId, formaPagoSlug as FormaPagoSlug)
    },
    [tenantId]
  )

  const procesarCobro = useCallback(
    async (input: CobroInput): Promise<CobroResultado> => {
      return paymentService.procesarCobro(input)
    },
    []
  )

  return {
    formasPago,
    cuentas,
    loading,
    error,
    cuentasDisponibles,
    procesarCobro,
  }
}
