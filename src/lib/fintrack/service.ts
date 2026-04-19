// ─────────────────────────────────────────────────────────────
// ZytekOS · FinTrack · Servicio
// Gestión de cuentas, monedas, tasas y movimientos.
// Archivo: src/lib/fintrack/service.ts
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/lib/supabase.client'
import type {
  AplicarMovimientoInput,
  Cuenta,
  CuentaPorFormaPago,
  FormaPago,
  FormaPagoSlug,
  Moneda,
  Movimiento,
} from './types'

export class FinTrackService {
  async listarCuentas(tenantId: string): Promise<Cuenta[]> {
    const { data, error } = await supabase
      .from('fintrack_cuentas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden')

    if (error) throw error
    return (data ?? []) as Cuenta[]
  }

  async listarFormasPago(tenantId: string): Promise<FormaPago[]> {
    const { data, error } = await supabase
      .from('fintrack_formas_pago_tenant')
      .select(`
        forma_pago_slug,
        activa,
        fintrack_formas_pago_catalogo!inner(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden')

    if (error) throw error
    // supabase-js tipa las relaciones FK como array; en runtime es el objeto
    // del catalog. Cast a any para evitar gymnastics de tipos.
    return (data ?? []).map(
      (row: any) => row.fintrack_formas_pago_catalogo as FormaPago,
    )
  }

  async cuentasPorFormaPago(
    tenantId: string,
    slug: FormaPagoSlug,
  ): Promise<CuentaPorFormaPago[]> {
    const { data, error } = await supabase.rpc(
      'fintrack_cuentas_por_forma_pago',
      {
        p_tenant_id: tenantId,
        p_forma_pago_slug: slug,
      },
    )

    if (error) throw error
    return (data ?? []) as CuentaPorFormaPago[]
  }

  async listarMonedas(tenantId: string): Promise<Moneda[]> {
    const { data, error } = await supabase
      .from('fintrack_tenant_monedas')
      .select(`
        moneda_codigo,
        es_principal,
        fintrack_monedas!inner(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden')

    if (error) throw error
    return (data ?? []).map(
      (row: any) => row.fintrack_monedas as Moneda,
    )
  }

  async tasaActual(
    tenantId: string,
    origen: string,
    destino: string,
  ): Promise<number | null> {
    const { data, error } = await supabase
      .from('fintrack_tasas')
      .select('tasa')
      .eq('tenant_id', tenantId)
      .eq('moneda_origen', origen)
      .eq('moneda_destino', destino)
      .lte('fecha', new Date().toISOString().split('T')[0])
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data?.tasa ?? null
  }

  async aplicarMovimiento(input: AplicarMovimientoInput): Promise<string> {
    const { data, error } = await supabase.rpc('fintrack_aplicar_movimiento', {
      p_tenant_id: input.tenantId,
      p_cuenta_id: input.cuentaId,
      p_tipo: input.tipo,
      p_monto: input.monto,
      p_moneda_codigo: input.monedaCodigo,
      p_usuario_id: input.usuarioId,
      p_referencia_tipo: input.referenciaTipo ?? null,
      p_referencia_id: input.referenciaId ?? null,
      p_forma_pago_slug: input.formaPagoSlug ?? null,
      p_cuenta_contraparte_id: input.cuentaContraparteId ?? null,
      p_descripcion: input.descripcion ?? null,
      p_metadata: input.metadata ?? {},
    })

    if (error) throw error
    return data as string
  }

  async movimientosPorReferencia(
    tenantId: string,
    tipo: string,
    id: string,
  ): Promise<Movimiento[]> {
    const { data, error } = await supabase
      .from('fintrack_movimientos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('referencia_tipo', tipo)
      .eq('referencia_id', id)
      .order('created_at')

    if (error) throw error
    return (data ?? []) as Movimiento[]
  }
}

export const fintrack = new FinTrackService()
