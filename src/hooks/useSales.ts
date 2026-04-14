'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase.client'
import type { Venta } from '@/types'

export type DateRange = 'today' | 'week' | 'month' | 'custom'

interface SalesFilters {
  range: DateRange
  desde?: string
  hasta?: string
}

export function useSales(tenantId: string, filters: SalesFilters) {
  const [sales, setSales] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSales = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)

    const now = new Date()
    let desde: Date | null = null
    let hasta: Date | null = null

    if (filters.range === 'today') {
      desde = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      hasta = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (filters.range === 'week') {
      const day = now.getDay()
      desde = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      hasta = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59)
    } else if (filters.range === 'month') {
      desde = new Date(now.getFullYear(), now.getMonth(), 1)
      hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (filters.range === 'custom' && filters.desde) {
      desde = new Date(filters.desde + 'T00:00:00')
      hasta = filters.hasta ? new Date(filters.hasta + 'T23:59:59') : null
    }

    let query = supabase
      .from('ventas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (desde) query = query.gte('created_at', desde.toISOString())
    if (hasta) query = query.lte('created_at', hasta.toISOString())

    try {
  const { data, error: err } = await query.limit(500)
      if (err) throw err
      setSales((data || []).map(s => ({ ...s, createdAt: s.created_at } as Venta)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando ventas')
    } finally {
      setLoading(false)
    }
  }, [tenantId, filters])

  const createSale = async (sale: Omit<Venta, 'id' | 'ts' | 'createdAt'>) => {
    const id = 'S' + Date.now()
    const now = new Date().toISOString()
    
    const { error: err } = await supabase
      .from('ventas')
      .insert({ ...sale, id, ts: Date.now(), created_at: now })
    
    if (!err) {
      setSales(prev => [{ ...sale, id, ts: Date.now(), createdAt: now } as Venta, ...prev])
    }
    return { ok: !err, id }
  }

  const total = sales.reduce((sum, s) => sum + (s.total || 0), 0)

  const byPaymentMethod = sales.reduce((acc, s) => {
    const method = s.formasPago?.[0]?.tipo || 'efectivo'
    acc[method] = (acc[method] || 0) + (s.total || 0)
    return acc
  }, {} as Record<string, number>)

  return { sales, loading, error, total, byPaymentMethod, refetch: fetchSales, createSale }
}

export function getSalesKPIs(sales: Venta[]) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const hoy = sales.filter(s => new Date(s.createdAt || s.created_at) >= now).reduce((t, s) => t + (s.total || 0), 0)
  const semana = sales.filter(s => new Date(s.createdAt || s.created_at) >= weekStart).reduce((t, s) => t + (s.total || 0), 0)
  const mes = sales.filter(s => new Date(s.createdAt || s.created_at) >= monthStart).reduce((t, s) => t + (s.total || 0), 0)

  return { hoy, semana, mes }
}

export function getTopItems(sales: Venta[], limit = 10) {
  const itemSales: Record<string, { name: string; qty: number; total: number }> = {}

  sales.forEach(sale => {
    if (!Array.isArray(sale.items)) return
    sale.items.forEach(item => {
      const id = item.itemId || item.nombre
      if (!itemSales[id]) {
        itemSales[id] = { name: item.nombre, qty: 0, total: 0 }
      }
      itemSales[id].qty += item.cantidad
      itemSales[id].total += (item.subtotal || item.precio * item.cantidad)
    })
  })

  return Object.values(itemSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
