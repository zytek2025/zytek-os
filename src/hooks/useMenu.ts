'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase.client'
import type { MenuItem } from '@/types'

export function useMenu(tenantId: string) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMenu = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nombre')
      
      if (err) throw err
      setItems(data || [])
    } catch (e: any) {
      setError(e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  const updateItem = async (id: string, updates: Partial<MenuItem>) => {
    const { error: err } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
    
    if (!err) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
    }
    return !err
  }

  const addItem = async (newItem: Omit<MenuItem, 'id'>) => {
    const { data, error: err } = await supabase
      .from('menu_items')
      .insert({ ...newItem, tenant_id: tenantId })
      .select()
      .single()
    
    if (!err && data) {
      setItems(prev => [...prev, data])
    }
    return data || null
  }

  const categories = [...new Set(items.map(i => i.cat || 'Otros'))].sort()

  return { items, loading, error, categories, updateItem, addItem, refetch: fetchMenu }
}
