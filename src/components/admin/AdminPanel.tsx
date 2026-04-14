'use client'
import { useState, useEffect } from 'react'
import type { License, MenuItem, ZytekUser } from '@/types'
import { useMenu } from '@/hooks/useMenu'
import { useSales, getSalesKPIs, getTopItems } from '@/hooks/useSales'
import { supabase } from '@/lib/supabase.client'

type Section = 
  | 'sec-categorias' | 'sec-subgrupos' | 'sec-items' | 'sec-mod-grupos' | 'sec-mod-items'
  | 'sec-inventario' | 'sec-reportes' 
  | 'sec-clientes' | 'sec-cxc' | 'sec-fidelizacion'
  | 'sec-usuarios' | 'sec-permisos' | 'sec-auditoria' 
  | 'sec-general' | 'sec-moneda' | 'sec-metodos' | 'sec-impuestos' | 'sec-pos'

type SubSection = 'menu' | 'compras' | 'inv' | 'reportes' | 'clientes' | 'ia' | 'sistema' | 'config'

interface Category {
  id: string
  nombre: string
  emoji?: string
  orden: number
  activo: boolean
}

interface SubGrupo {
  id: string
  nombre: string
  categoriaId: string
  emoji?: string
  orden: number
}

interface ModGrupo {
  id: string
  nombre: string
  tipo: 'excluyente' | 'multiple' | 'cantidad'
  min: number
  max: number
}

interface Modificador {
  id: string
  nombre: string
  grupoId: string
  precioAdicional: number
  activo: boolean
}

export function AdminPanel({ license }: { license: License }) {
  const [section, setSection] = useState<Section>('sec-categorias')
  const [activeGroup, setActiveGroup] = useState<SubSection>('menu')
  const [menuExpanded, setMenuExpanded] = useState(true)
  const [clientesExpanded, setClientesExpanded] = useState(false)
  const [sistemaExpanded, setSistemaExpanded] = useState(false)
  const [configExpanded, setConfigExpanded] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [user, setUser] = useState<ZytekUser | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [subGrupos, setSubGrupos] = useState<SubGrupo[]>([])
  const [modGrupos, setModGrupos] = useState<ModGrupo[]>([])
  const [modificadores, setModificadores] = useState<Modificador[]>([])

  const filters = { range: 'today' as const, desde: '', hasta: '' }
  const { items: menuItems, loading: menuLoading, refetch: refetchMenu, updateItem } = useMenu(license.tenantId)
  const { sales, loading: salesLoading, refetch: refetchSales } = useSales(license.tenantId, filters)

  const kpis = getSalesKPIs(sales)
  const topItems = getTopItems(sales, 10)

  useEffect(() => {
    loadCategories()
    loadSubgrupos()
    loadModGrupos()
    loadModificadores()
  }, [license.tenantId])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('menu_categorias')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .order('orden')
    if (data) setCategories(data)
  }

  const loadSubgrupos = async () => {
    const { data } = await supabase
      .from('menu_subgrupos')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .order('orden')
    if (data) setSubGrupos(data)
  }

  const loadModGrupos = async () => {
    const { data } = await supabase
      .from('mod_grupos')
      .select('*')
      .eq('tenant_id', license.tenantId)
    if (data) setModGrupos(data)
  }

  const loadModificadores = async () => {
    const { data } = await supabase
      .from('modificadores')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .order('nombre')
    if (data) setModificadores(data)
  }

  const styles = {
    bg: theme === 'dark' ? '#0d0d0f' : '#f4f4f8',
    surface: theme === 'dark' ? '#16161a' : '#fff',
    surface2: theme === 'dark' ? '#1e1e24' : '#f0f0f5',
    topbar: theme === 'dark' ? '#111114' : '#fff',
    border: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    border2: theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)',
    text: theme === 'dark' ? '#f0f0f5' : '#111118',
    textMid: theme === 'dark' ? '#b0b0c0' : '#444455',
    textDim: theme === 'dark' ? '#606070' : '#888899',
    orange: '#ff7c20',
    orangeDim: 'rgba(255,124,32,0.12)',
    orangeB: 'rgba(255,124,32,0.3)',
    green: '#2ee87a',
    greenDim: 'rgba(46,232,122,0.1)',
    greenB: 'rgba(46,232,122,0.25)',
    red: '#ff4757',
    redDim: 'rgba(255,71,87,0.12)',
    redB: 'rgba(255,71,87,0.25)',
    blue: '#38b6ff',
    blueDim: 'rgba(56,182,255,0.1)',
    blueB: 'rgba(56,182,255,0.25)',
    amber: '#ffc040',
    amberDim: 'rgba(255,192,64,0.1)',
    amberB: 'rgba(255,192,64,0.25)',
    purple: '#a855f7',
  }

  const renderSidebar = () => (
    <div style={{ 
      width: 220, 
      background: styles.surface, 
      borderRight: `1px solid ${styles.border}`, 
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto',
      flexShrink: 0 
    }}>
      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          🍽️ Menú de Ventas
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-categorias' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-categorias' ? styles.orangeDim : 'transparent', border: section === 'sec-categorias' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-categorias')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>🗂️</span>
          Categorías
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-subgrupos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-subgrupos' ? styles.orangeDim : 'transparent', border: section === 'sec-subgrupos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-subgrupos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>📐</span>
          Sub-grupos
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-items' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-items' ? styles.orangeDim : 'transparent', border: section === 'sec-items' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-items')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>🍽️</span>
          Ítems / Platos
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-mod-grupos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-mod-grupos' ? styles.orangeDim : 'transparent', border: section === 'sec-mod-grupos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-mod-grupos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>🔧</span>
          Grupos de Mods
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-mod-items' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-mod-items' ? styles.orangeDim : 'transparent', border: section === 'sec-mod-items' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-mod-items')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>✏️</span>
          Modificadores
        </div>
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-inventario' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1 }}
          onClick={() => setSection('sec-inventario')}>
          <span style={{ fontSize: 16, marginRight: 8 }}>📦</span>
          Inventario
        </div>
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-reportes' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-reportes' ? styles.orangeDim : 'transparent', border: section === 'sec-reportes' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-reportes')}>
          <span style={{ fontSize: 16, marginRight: 8 }}>📊</span>
          Reportes
        </div>
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          👥 Clientes
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 18px', borderRadius: 6, cursor: 'pointer', color: styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1 }}
          onClick={() => setSection('sec-clientes')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>👥</span>
          Directorio
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 18px', borderRadius: 6, cursor: 'pointer', color: styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1 }}
          onClick={() => setSection('sec-cxc')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>💳</span>
          CxC — Créditos
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 18px', borderRadius: 6, cursor: 'pointer', color: styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1 }}
          onClick={() => setSection('sec-fidelizacion')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⭐</span>
          Fidelización
        </div>
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          ⚙️ Sistema
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-usuarios' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-usuarios' ? styles.orangeDim : 'transparent', border: section === 'sec-usuarios' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-usuarios')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>👥</span>
          Usuarios
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-permisos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-permisos' ? styles.orangeDim : 'transparent', border: section === 'sec-permisos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-permisos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>🔐</span>
          Permisos
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-auditoria' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-auditoria' ? styles.orangeDim : 'transparent', border: section === 'sec-auditoria' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-auditoria')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>📜</span>
          Auditoría
        </div>
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          🔩 Configuración
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-general' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-general' ? styles.orangeDim : 'transparent', border: section === 'sec-general' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-general')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⚙️</span>
          General
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-moneda' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-moneda' ? styles.orangeDim : 'transparent', border: section === 'sec-moneda' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-moneda')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>💱</span>
          Moneda / Tasa
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-metodos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-metodos' ? styles.orangeDim : 'transparent', border: section === 'sec-metodos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-metodos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>💳</span>
          Métodos de Pago
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-impuestos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-impuestos' ? styles.orangeDim : 'transparent', border: section === 'sec-impuestos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-impuestos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>📊</span>
          Impuestos
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: section === 'sec-pos' ? styles.orange : styles.textMid, fontSize: 12, fontWeight: 500, marginBottom: 1, background: section === 'sec-pos' ? styles.orangeDim : 'transparent', border: section === 'sec-pos' ? `1px solid ${styles.orangeB}` : '1px solid transparent' }}
          onClick={() => setSection('sec-pos')}>
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>🖥️</span>
          Punto de Venta
        </div>
      </div>
    </div>
  )

  const renderCategorias = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Categorías del Menú
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Grupos de ítems · sub-grupos opcionales · imagen o emoji
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Categorías activas</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>Click para editar · arrastra para reordenar</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            + Nueva categoría
          </button>
        </div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {categories.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
              No hay categorías. Crea la primera.
            </div>
          ) : (
            categories.filter(c => c.activo).map(cat => (
              <div key={cat.id} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.13s', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1 }}>{cat.emoji || '🍽️'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>{cat.nombre}</div>
                <div style={{ fontSize: 9, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>#{cat.orden}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderSubGrupos = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Sub-grupos
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Tamaños · presentaciones · variantes que definen el precio · ej: Personal / Mediana / Grande
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Filtrar por categoría</div>
          <select style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 6, padding: '7px 10px', color: styles.text, fontSize: 12, outline: 'none', width: 220 }}>
            <option value="">Todas las categorías con sub-grupos</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Sub-grupos configurados</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>{subGrupos.length} sub-grupos</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo sub-grupo
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nombre</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Categoría</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Emoji</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Orden</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            {subGrupos.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>No hay sub-grupos configurados</td></tr>
            ) : (
              subGrupos.map(sg => (
                <tr key={sg.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{sg.nombre}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{categories.find(c => c.id === sg.categoriaId)?.nombre || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{sg.emoji || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{sg.orden}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderItems = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Ítems / Platos
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Crear y editar platos · precios · modificadores · recetas
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace' }}>CATEGORÍA:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {categories.map(cat => (
              <button key={cat.id} style={{ padding: '3px 10px', borderRadius: 12, border: `1px solid ${styles.border}`, background: 'transparent', fontSize: 10, fontFamily: 'DM Mono, monospace', color: styles.textDim, cursor: 'pointer' }}>
                {cat.emoji} {cat.nombre}
              </button>
            ))}
          </div>
          <input placeholder="Buscar plato..." style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${styles.border}`, background: styles.surface, color: styles.text, fontSize: 11, fontFamily: 'DM Mono, monospace', width: 160 }} />
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo ítem
          </button>
        </div>
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nombre</th>
                <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Categoría</th>
                <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'right', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Precio</th>
                <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Estado</th>
                <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}></th>
              </tr>
            </thead>
            <tbody>
              {menuItems.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>No hay ítems</td></tr>
              ) : (
                menuItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{item.emoji || '🍽️'}</span> {item.nombre}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{item.cat}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>${item.precio.toFixed(2)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: item.activo ? styles.greenDim : styles.redDim, color: item.activo ? styles.green : styles.red, border: `1px solid ${item.activo ? styles.greenB : styles.redB}` }}>
                        {item.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderModGrupos = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Grupos de Modificadores
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Conjuntos de contornos · extras · opcionales · con mínimo y máximo de selección
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Grupos</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>{modGrupos.length} grupos</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo grupo
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nombre del grupo</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Tipo</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Mín</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Máx</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Modificadores</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            {modGrupos.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>No hay grupos</td></tr>
            ) : (
              modGrupos.map(mg => (
                <tr key={mg.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, fontWeight: 600 }}>{mg.nombre}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>{mg.tipo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>{mg.min}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>{mg.max}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>{modificadores.filter(m => m.grupoId === mg.id).length}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderModItems = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Modificadores
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Contornos · extras · opciones individuales · con precio adicional opcional
      </div>
      
      <div style={{ marginBottom: 10, display: 'flex' }}>
        <select style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 6, padding: '7px 10px', color: styles.text, fontSize: 12, outline: 'none', width: 240 }}>
          <option value="">Todos los grupos</option>
          {modGrupos.map(mg => (
            <option key={mg.id} value={mg.id}>{mg.nombre}</option>
          ))}
        </select>
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Modificadores</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>{modificadores.length} total</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo modificador
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nombre</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Grupo</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'right', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Precio adicional</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Estado</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            {modificadores.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>No hay modificadores</td></tr>
            ) : (
              modificadores.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{m.nombre}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{modGrupos.find(g => g.id === m.grupoId)?.nombre || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.blue, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{m.precioAdicional > 0 ? `+$${m.precioAdicional.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: m.activo ? styles.greenDim : styles.redDim, color: m.activo ? styles.green : styles.red, border: `1px solid ${m.activo ? styles.greenB : styles.redB}` }}>
                      {m.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderReportes = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 4 }}>
        Reportes
      </div>
      <div style={{ fontSize: 12, color: styles.textDim, marginBottom: 20 }}>Selecciona una categoría para ver su dashboard</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Ventas hoy</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.green }}>${kpis.hoy.toFixed(2)}</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Tickets</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.text }}>{sales.length}</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Ticket prom.</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.text }}>${sales.length > 0 ? (kpis.hoy / sales.length).toFixed(2) : '0.00'}</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>CxP pendiente</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.red }}>$380</div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, paddingBottom: 10 }}> Categorías</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Ventas</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Análisis de ventas por período, método de pago, cajero</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>🍽️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Menú</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Platos más vendidos, rentabilidad por categoría</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>🪑</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Mesas</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Rotación, tiempo promedio, ocupación</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Personal</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Desempeño por empleado, horarios</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Inventario</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Stock, consumo, alertas</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 28 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>Fiscal</div>
          <div style={{ fontSize: 11, color: styles.textDim, lineHeight: 1.5 }}>Registro de ventas, retenciónes</div>
        </div>
      </div>
    </div>
  )

  const renderUsuarios = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Usuarios
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Gestión de usuarios · PINs · roles y permisos
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Usuarios</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.text }}>5</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Activos</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.green }}>4</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Admin</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.orange }}>1</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Cajeros</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.blue }}>2</div>
        </div>
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Usuarios del sistema</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>Click para editar</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo usuario
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nombre</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Rol</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Nivel</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Ventas hoy</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: styles.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>A</div>
                Admin
              </td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>Administrador</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>1</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>$0.00</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: styles.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>C</div>
                Carlos M.
              </td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>Cajero</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center' }}>3</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>$420.50</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>✏️</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPermisos = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Permisos
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Matriz de permisos por rol y módulo
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, padding: '7px 8px', textAlign: 'left', borderBottom: `1px solid ${styles.border}`, minWidth: 160 }}>Permiso</th>
              <th style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, padding: '7px 8px', textAlign: 'center', borderBottom: `1px solid ${styles.border}`, minWidth: 64 }}>Admin</th>
              <th style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, padding: '7px 8px', textAlign: 'center', borderBottom: `1px solid ${styles.border}`, minWidth: 64 }}>Gerente</th>
              <th style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, padding: '7px 8px', textAlign: 'center', borderBottom: `1px solid ${styles.border}`, minWidth: 64 }}>Cajero</th>
              <th style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, padding: '7px 8px', textAlign: 'center', borderBottom: `1px solid ${styles.border}`, minWidth: 64 }}>Mesero</th>
            </tr>
          </thead>
          <tbody>
            {['Ver reportes', 'Editar menú', 'Eliminar items', 'Editar precios', 'Eliminar ventas', 'Ver auditoría', 'Gestionar usuarios', 'Gestionar clientes'].map(perm => (
              <tr key={perm}>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid rgba(255,255,255,0.03)`, textAlign: 'left', fontSize: 11, color: styles.text }}>{perm}</td>
                {['Admin', 'Gerente', 'Cajero', 'Mesero'].map(rol => (
                  <td key={rol} style={{ padding: '7px 8px', borderBottom: `1px solid rgba(255,255,255,0.03)`, textAlign: 'center', fontSize: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${styles.border}`, background: rol === 'Admin' || (perm === 'Ver reportes' && rol === 'Cajero') ? styles.greenDim : styles.surface2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, color: rol === 'Admin' || (perm === 'Ver reportes' && rol === 'Cajero') ? styles.green : 'transparent' }}>
                      ✓
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderAuditoria = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Auditoría
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Registro de actividades · logs del sistema
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: styles.green, flexShrink: 0, marginTop: 4 }} />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.textDim, width: 60, flexShrink: 0 }}>10:32</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.orange, width: 85, flexShrink: 0 }}>Admin</div>
          <div style={{ fontSize: 11, color: styles.textMid, flex: 1 }}>Creó ítem &quot;Bandeja Paisa&quot;</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: styles.blue, flexShrink: 0, marginTop: 4 }} />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.textDim, width: 60, flexShrink: 0 }}>10:28</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.orange, width: 85, flexShrink: 0 }}>Carlos M.</div>
          <div style={{ fontSize: 11, color: styles.textMid, flex: 1 }}>Completó venta #V-2024-0156 ($45.00)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: styles.amber, flexShrink: 0, marginTop: 4 }} />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.textDim, width: 60, flexShrink: 0 }}>10:15</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.orange, width: 85, flexShrink: 0 }}>Admin</div>
          <div style={{ fontSize: 11, color: styles.textMid, flex: 1 }}>Editó categoría &quot;Bebidas&quot;</div>
        </div>
      </div>
    </div>
  )

  const renderGeneral = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Configuración General
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Ajustes del sistema · tenant · datos generales
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>Nombre del negocio</div>
            <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>Razón social</div>
          </div>
          <input defaultValue={license.tenantName} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 6, padding: '7px 10px', color: styles.text, fontSize: 12, outline: 'none', width: 200, textAlign: 'right' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>País</div>
            <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>Ubicación fiscal</div>
          </div>
          <select style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 6, padding: '7px 10px', color: styles.text, fontSize: 12, outline: 'none', width: 200 }}>
            <option>Venezuela</option>
            <option>Colombia</option>
            <option>México</option>
            <option>EE.UU.</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>Zona horaria</div>
            <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>Venezuela (UTC-4)</div>
          </div>
          <select style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 6, padding: '7px 10px', color: styles.text, fontSize: 12, outline: 'none', width: 200 }}>
            <option>America/Caracas</option>
            <option>America/Bogota</option>
            <option>America/Mexico_City</option>
            <option>America/New_York</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>Tema</div>
            <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>Apariencia de la interfaz</div>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 36, height: 20, borderRadius: 10, background: styles.orange, border: `1px solid ${styles.orangeB}`, position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: theme === 'dark' ? 18 : 3, transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>
    </div>
  )

  const renderInventario = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Inventario
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Control de insumos · recetas · alertas de stock
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Insumos</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.text }}>24</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Recetas</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.text }}>12</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Alertas</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.amber }}>3</div>
        </div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: styles.textDim, marginBottom: 4 }}>Valor stock</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: styles.green }}>$1,240</div>
        </div>
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Insumos</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>Click para editar</div>
          </div>
          <button style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo insumo
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'left', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Insumo</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'right', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Stock</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'right', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Mín</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'right', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Costo</th>
              <th style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: styles.textDim, fontFamily: 'DM Mono, monospace', padding: '8px 12px', textAlign: 'center', background: styles.surface2, borderBottom: `1px solid ${styles.border}` }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>Arroz</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>15 kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>5 kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>$0.85/kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: styles.greenDim, color: styles.green, border: `1px solid ${styles.greenB}` }}>
                  OK
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>Pollo</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.red, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>3 kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>5 kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>$3.20/kg</td>
              <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: styles.redDim, color: styles.red, border: `1px solid ${styles.redB}` }}>
                  BAJO
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (section) {
      case 'sec-categorias': return renderCategorias()
      case 'sec-subgrupos': return renderSubGrupos()
      case 'sec-items': return renderItems()
      case 'sec-mod-grupos': return renderModGrupos()
      case 'sec-mod-items': return renderModItems()
      case 'sec-inventario': return renderInventario()
      case 'sec-reportes': return renderReportes()
      case 'sec-usuarios': return renderUsuarios()
      case 'sec-permisos': return renderPermisos()
      case 'sec-auditoria': return renderAuditoria()
      case 'sec-general': return renderGeneral()
      case 'sec-clientes':
      case 'sec-cxc':
      case 'sec-fidelizacion':
      case 'sec-moneda':
      case 'sec-metodos':
      case 'sec-impuestos':
      case 'sec-pos':
      default:
        return (
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
              Panel Administrativo
            </div>
            <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
              ZytekOS Cloud ERP - Módulo Admin
            </div>
            <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: styles.textDim }}>Selecciona una opción del menú lateral</div>
            </div>
          </div>
        )
    }
  }

  const now = new Date()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: styles.bg, overflow: 'hidden' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, background: styles.topbar, borderBottom: `2px solid ${styles.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>🔐</div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 900, color: styles.text }}>Panel Administrativo</div>
            <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: styles.textDim }}>ZYTEK CLOUD ERP</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: styles.textDim }}>
              {now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: styles.text }}>
              {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: styles.surface2, border: `1px solid ${styles.border}`, cursor: 'pointer' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', background: styles.orange }}>
              A
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: styles.text }}>Admin</div>
              <div style={{ fontSize: 9, color: styles.textDim, fontFamily: 'DM Mono, monospace' }}>ADMIN</div>
            </div>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {renderSidebar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 0 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}