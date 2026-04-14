'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase.client'
import type { MenuItem } from '@/types'

const DEMO_MENU: MenuItem[] = [
  { id: '1', nombre: 'Café Americano', cat: 'Bebidas Calientes', precio: 3.50, activo: true, emoji: '☕' },
  { id: '2', nombre: 'Cappuccino', cat: 'Bebidas Calientes', precio: 4.50, activo: true, emoji: '☕' },
  { id: '3', nombre: 'Té Verde', cat: 'Bebidas Calientes', precio: 3.00, activo: true, emoji: '🍵' },
  { id: '4', nombre: 'Chocolate Caliente', cat: 'Bebidas Calientes', precio: 4.00, activo: true, emoji: '🍫' },
  { id: '5', nombre: 'Jugo de Naranja', cat: 'Bebidas Frías', precio: 4.00, activo: true, emoji: '🍊' },
  { id: '6', nombre: 'Limonada', cat: 'Bebidas Frías', precio: 3.50, activo: true, emoji: '🍋' },
  { id: '7', nombre: 'Batido de Fresa', cat: 'Bebidas Frías', precio: 5.00, activo: true, emoji: '🍓' },
  { id: '8', nombre: 'Agua Mineral', cat: 'Bebidas Frías', precio: 2.00, activo: true, emoji: '💧' },
  { id: '9', nombre: 'Croissant', cat: 'Pastelería', precio: 2.50, activo: true, emoji: '🥐' },
  { id: '10', nombre: 'Torta de Chocolate', cat: 'Pastelería', precio: 4.00, activo: true, emoji: '🍰' },
  { id: '11', nombre: 'Cheesecake', cat: 'Pastelería', precio: 5.00, activo: true, emoji: '🧀' },
  { id: '12', nombre: 'Galletas', cat: 'Pastelería', precio: 2.00, activo: true, emoji: '🍪' },
  { id: '13', nombre: 'Ensalada César', cat: 'Entradas', precio: 8.00, activo: true, emoji: '🥗' },
  { id: '14', nombre: 'Sopa del Día', cat: 'Entradas', precio: 5.00, activo: true, emoji: '🍲' },
  { id: '15', nombre: 'Bruschetta', cat: 'Entradas', precio: 6.00, activo: true, emoji: '🍅' },
  { id: '16', nombre: 'Pasta Carbonara', cat: 'Platos Principales', precio: 12.00, activo: true, emoji: '🍝' },
  { id: '17', nombre: 'Risotto', cat: 'Platos Principales', precio: 14.00, activo: true, emoji: '🍚' },
  { id: '18', nombre: 'Filete de Res', cat: 'Platos Principales', precio: 18.00, activo: true, emoji: '🥩' },
  { id: '19', nombre: 'Pollo a la Plancha', cat: 'Platos Principales', precio: 13.00, activo: true, emoji: '🍗' },
  { id: '20', nombre: 'Paella', cat: 'Platos Principales', precio: 15.00, activo: true, emoji: '🥘' },
]

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
        .eq('activo', true)
        .order('cat')
        .order('nombre')
      
      if (err) throw err
      
      if (data && data.length > 0) {
        setItems(data)
      } else {
        setItems(DEMO_MENU)
      }
    } catch (e) {
      setItems(DEMO_MENU)
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

  const categories = [...new Set(items.map(i => i.cat || 'Otros'))].sort()

  return { items, loading, error, categories, updateItem, refetch: fetchMenu }
}
