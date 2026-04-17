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
  categoria_id: string
  emoji?: string
  orden: number
}

interface ModGrupo {
  id: string
  nombre: string
  tipo: 'contorno' | 'extra' | 'sin' | 'seleccion'
  min_selections: number
  max_selections: number
}

interface Modificador {
  id: string
  nombre: string
  grupo_id: string
  precio_adicional: number
  activo: boolean
}

interface MetodoPago {
  id: string
  identificador: string
  label: string
  emoji: string
  moneda: 'usd' | 'bs' | 'eur' | 'mxn'
  activo: boolean
  orden: number
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
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const isBasic = license.plan === 'basic'

  const [categories, setCategories] = useState<Category[]>([])
  const [subGrupos, setSubGrupos] = useState<SubGrupo[]>([])
  const [modGrupos, setModGrupos] = useState<ModGrupo[]>([])
  const [modificadores, setModificadores] = useState<Modificador[]>([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const [showModGrupoModal, setShowModGrupoModal] = useState(false)
  const [editingModGrupo, setEditingModGrupo] = useState<Partial<ModGrupo> | null>(null)
  const [showModificadorModal, setShowModificadorModal] = useState(false)
  const [editingModificador, setEditingModificador] = useState<Partial<Modificador> | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [showSubGrupoModal, setShowSubGrupoModal] = useState(false)
  const [editingSubGrupo, setEditingSubGrupo] = useState<Partial<SubGrupo> | null>(null)
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [showMetodoModal, setShowMetodoModal] = useState(false)
  const [editingMetodo, setEditingMetodo] = useState<Partial<MetodoPago> | null>(null)

  const filters = { range: 'today' as const, desde: '', hasta: '' }
  const { items: menuItems, loading: menuLoading, refetch: refetchMenu, updateItem, addItem } = useMenu(license.tenantId)
  const { sales, loading: salesLoading, refetch: refetchSales } = useSales(license.tenantId, filters)

  const kpis = getSalesKPIs(sales)
  const topItems = getTopItems(sales, 10)

  useEffect(() => {
    loadCategories()
    loadSubgrupos()
    loadModGrupos()
    loadModificadores()
    loadMetodosPago()
  }, [license.tenantId])

  const loadMetodosPago = async () => {
    const { data } = await supabase
      .from('metodos_pago')
      .select('*')
      .eq('tenant_id', license.tenantId)
      .order('orden')
    if (data) setMetodosPago(data)
  }

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

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem({ nombre: '', precio: 0, cat: categories[0]?.id || '', activo: true, emoji: '🍽️' })
    }
    setShowItemModal(true)
  }

  const saveItem = async () => {
    if (!editingItem) return
    if (editingItem.id) {
      await updateItem(editingItem.id, editingItem)
    } else {
      if (addItem) await addItem(editingItem as Omit<MenuItem, 'id'>)
    }
    setShowItemModal(false)
  }

  const openModGrupoModal = (grupo?: ModGrupo) => {
    if (grupo) {
      setEditingModGrupo(grupo)
    } else {
      setEditingModGrupo({ nombre: '', tipo: 'contorno', min_selections: 0, max_selections: 1 })
    }
    setShowModGrupoModal(true)
  }

  const saveModGrupo = async () => {
    if (!editingModGrupo) return
    if (editingModGrupo.id) {
      const { error } = await supabase.from('mod_grupos').update(editingModGrupo).eq('id', editingModGrupo.id).eq('tenant_id', license.tenantId)
      if (!error) loadModGrupos()
    } else {
      const { error } = await supabase.from('mod_grupos').insert({ ...editingModGrupo, tenant_id: license.tenantId })
      if (!error) loadModGrupos()
    }
    setShowModGrupoModal(false)
  }

  const openModificadorModal = (mod?: Modificador) => {
    if (mod) {
      setEditingModificador(mod)
    } else {
      setEditingModificador({ nombre: '', grupo_id: modGrupos[0]?.id || '', precio_adicional: 0, activo: true })
    }
    setShowModificadorModal(true)
  }

  const saveModificador = async () => {
    if (!editingModificador) return
    if (editingModificador.id) {
      const { error } = await supabase.from('modificadores').update(editingModificador).eq('id', editingModificador.id).eq('tenant_id', license.tenantId)
      if (!error) loadModificadores()
    } else {
      const { error } = await supabase.from('modificadores').insert({ ...editingModificador, tenant_id: license.tenantId })
      if (!error) loadModificadores()
    }
    setShowModificadorModal(false)
  }

  const openCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat)
    } else {
      setEditingCategory({ nombre: '', emoji: '🍽️', orden: categories.length + 1, activo: true })
    }
    setShowCategoryModal(true)
  }

  const saveCategory = async () => {
    if (!editingCategory) return
    if (editingCategory.id) {
      const { error } = await supabase.from('menu_categorias').update(editingCategory).eq('id', editingCategory.id).eq('tenant_id', license.tenantId)
      if (!error) loadCategories()
    } else {
      const { error } = await supabase.from('menu_categorias').insert({ ...editingCategory, tenant_id: license.tenantId })
      if (!error) loadCategories()
    }
    setShowCategoryModal(false)
  }

  const openSubGrupoModal = (sub?: SubGrupo) => {
    if (sub) {
      setEditingSubGrupo(sub)
    } else {
      setEditingSubGrupo({ nombre: '', categoria_id: categories[0]?.id || '', emoji: '📐', orden: 1 })
    }
    setShowSubGrupoModal(true)
  }

  const saveSubGrupo = async () => {
    if (!editingSubGrupo) return
    if (editingSubGrupo.id) {
      const { error } = await supabase.from('menu_subgrupos').update(editingSubGrupo).eq('id', editingSubGrupo.id).eq('tenant_id', license.tenantId)
      if (!error) loadSubgrupos()
    } else {
      const { error } = await supabase.from('menu_subgrupos').insert({ ...editingSubGrupo, tenant_id: license.tenantId })
      if (!error) loadSubgrupos()
    }
    setShowSubGrupoModal(false)
  }

  const openMetodoModal = (metodo?: MetodoPago) => {
    if (metodo) {
      setEditingMetodo(metodo)
    } else {
      setEditingMetodo({ identificador: '', label: '', emoji: '💵', moneda: 'usd', activo: true, orden: metodosPago.length + 1 })
    }
    setShowMetodoModal(true)
  }

  const saveMetodo = async () => {
    if (!editingMetodo) return
    if (editingMetodo.id) {
      const { error } = await supabase.from('metodos_pago').update(editingMetodo).eq('id', editingMetodo.id).eq('tenant_id', license.tenantId)
      if (!error) loadMetodosPago()
    } else {
      const { error } = await supabase.from('metodos_pago').insert({ ...editingMetodo, tenant_id: license.tenantId })
      if (!error) loadMetodosPago()
    }
    setShowMetodoModal(false)
  }

  const handleNavTarget = (target: Section, requiresPro: boolean) => {
    if (requiresPro && isBasic) {
      setShowUpgradeModal(true)
    } else {
      setSection(target)
    }
  }

  const renderSidebarItem = (target: Section, text: string, emoji: string, requiresPro: boolean = false, indented = false) => {
    const isLocked = requiresPro && isBasic
    const isActive = section === target

    return (
      <div 
        style={{ 
          display: 'flex', alignItems: 'center', gap: 8, 
          padding: indented ? '8px 10px 8px 18px' : '8px 10px', 
          borderRadius: 6, cursor: 'pointer', 
          color: isActive ? styles.orange : (isLocked ? styles.textDim : styles.textMid), 
          fontSize: 12, fontWeight: 500, marginBottom: 1, 
          background: isActive ? styles.orangeDim : 'transparent', 
          border: isActive ? `1px solid ${styles.orangeB}` : '1px solid transparent',
          opacity: isLocked ? 0.6 : 1
        }}
        onClick={() => handleNavTarget(target, requiresPro)}
      >
        <span style={{ fontSize: isLocked ? 12 : (indented ? 14 : 16), width: 18, textAlign: 'center', marginRight: indented ? 0 : 8 }}>
          {isLocked ? '🔒' : emoji}
        </span>
        {text}
      </div>
    )
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
        
        {renderSidebarItem('sec-categorias', 'Categorías', '🗂️', false, false)}
        {renderSidebarItem('sec-subgrupos', 'Sub-grupos', '📐', true, false)}
        {renderSidebarItem('sec-items', 'Ítems / Platos', '🍽️', false, false)}
        {renderSidebarItem('sec-mod-grupos', 'Grupos de Mods', '🔧', true, false)}
        {renderSidebarItem('sec-mod-items', 'Modificadores', '✏️', true, false)}
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        {renderSidebarItem('sec-inventario', 'Inventario', '📦', true, false)}
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        {renderSidebarItem('sec-reportes', 'Reportes', '📊', false, false)}
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          👥 Clientes
        </div>
        
        {renderSidebarItem('sec-clientes', 'Directorio', '👥', true, true)}
        {renderSidebarItem('sec-cxc', 'CxC — Créditos', '💳', true, true)}
        {renderSidebarItem('sec-fidelizacion', 'Fidelización', '⭐', true, true)}
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          ⚙️ Sistema
        </div>
        
        {renderSidebarItem('sec-usuarios', 'Usuarios', '👥', false, false)}
        {renderSidebarItem('sec-permisos', 'Permisos', '🔐', true, false)}
        {renderSidebarItem('sec-auditoria', 'Auditoría', '📜', true, false)}
      </div>

      <div style={{ padding: '6px 8px 2px' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: styles.textDim, padding: '10px 10px 4px' }}>
          🔩 Configuración
        </div>
        
        {renderSidebarItem('sec-general', 'General', '⚙️', false, false)}
        {renderSidebarItem('sec-moneda', 'Moneda / Tasa', '💱', true, false)}
        {renderSidebarItem('sec-metodos', 'Métodos de Pago', '💳', true, false)}
        {renderSidebarItem('sec-impuestos', 'Impuestos', '📊', true, false)}
        {renderSidebarItem('sec-pos', 'Punto de Venta', '🖥️', false, false)}
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
          <button onClick={() => openCategoryModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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
              <div key={cat.id} onClick={() => openCategoryModal(cat)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.13s', textAlign: 'center' }}>
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
          <button onClick={() => openSubGrupoModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
          <button onClick={() => openItemModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
                    <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>
                      <button onClick={() => openItemModal(item)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️</button>
                    </td>
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
          <button onClick={() => openModGrupoModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
          <button onClick={() => openModificadorModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>{modGrupos.find(g => g.id === m.grupo_id)?.nombre || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.blue, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{m.precio_adicional > 0 ? `+$${m.precio_adicional.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: m.activo ? styles.greenDim : styles.redDim, color: m.activo ? styles.green : styles.red, border: `1px solid ${m.activo ? styles.greenB : styles.redB}` }}>
                      {m.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: styles.textMid }}>
                    <button onClick={() => openModificadorModal(m)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️</button>
                  </td>
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

  const renderMetodos = () => (
    <div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 3 }}>
        Métodos de Pago
      </div>
      <div style={{ fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
        Configura los medios que aceptas en el POS · efectivo · digital · crédito
      </div>
      
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${styles.border}`, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: styles.text }}>Métodos habilitados</div>
            <div style={{ fontSize: 10, color: styles.textDim }}>{metodosPago.length} métodos</div>
          </div>
          <button onClick={() => openMetodoModal()} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: styles.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo método
          </button>
        </div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {metodosPago.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, color: styles.textDim, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
              No hay métodos de pago configurados.
            </div>
          ) : (
            metodosPago.map(m => (
              <div key={m.id} onClick={() => openMetodoModal(m)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.13s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{m.emoji || '💵'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: styles.text }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: styles.textDim, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>{m.moneda} · {m.active ? 'ACTIVO' : 'INACTIVO'}</div>
                  </div>
                </div>
              </div>
            ))
          )}
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
      case 'sec-metodos': return renderMetodos()
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
      
      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: styles.surface, border: `1px solid ${styles.orange}`, borderRadius: 12, padding: 30, maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: styles.text, marginBottom: 10 }}>Función Bloqueada</div>
            <div style={{ fontSize: 13, color: styles.textMid, marginBottom: 24, lineHeight: 1.5 }}>
              Esta función avanzada requiere el plan <b>Pro</b>. Para actualizar su suscripción y desbloquear todas las herramientas, contacte a soporte técnico.
            </div>
            <div style={{ background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, padding: 12, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: styles.textDim, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>WhatsApp Soporte</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: styles.orange }}>+1 (786) 896-4162</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.textMid, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Volver
              </button>
              <a 
                href="https://wa.me/17868964162" target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: styles.green, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Contactar
              </a>
            </div>
          </div>
        </div>
      )}

      {showItemModal && editingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowItemModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingItem.id ? 'Editar Ítem' : 'Nuevo Ítem'}</h3>
                <p style={{ margin: 0, fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>Configuración de plato o producto</p>
              </div>
              <button onClick={() => setShowItemModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>NOMBRE</label>
                  <input 
                    value={editingItem.nombre || ''} 
                    onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} 
                    placeholder="Ej. Pizza Margarita"
                  />
                </div>
                <div style={{ width: 60 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>EMOJI</label>
                  <input 
                    value={editingItem.emoji || ''} 
                    onChange={e => setEditingItem({ ...editingItem, emoji: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 0', textAlign: 'center', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 20 }} 
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>CATEGORÍA</label>
                  <select 
                    value={editingItem.cat || ''} 
                    onChange={e => setEditingItem({ ...editingItem, cat: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14, appearance: 'none' }}
                  >
                    <option value="">Selecciona una...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>PRECIO ($)</label>
                  <input 
                    type="number" step="0.01"
                    value={editingItem.precio === 0 ? '' : editingItem.precio} 
                    onChange={e => setEditingItem({ ...editingItem, precio: parseFloat(e.target.value) || 0 })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.orange, fontSize: 14, fontWeight: 'bold' }} 
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: styles.surface2, borderRadius: 8, border: `1px solid ${styles.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: styles.text, fontWeight: 600 }}>Ítem Activo</div>
                  <div style={{ fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace' }}>Mostrar en el POS para la venta</div>
                </div>
                <div 
                  onClick={() => setEditingItem({ ...editingItem, activo: !editingItem.activo })}
                  style={{ width: 40, height: 22, borderRadius: 11, background: editingItem.activo ? styles.orange : styles.border, position: 'relative', cursor: 'pointer', transition: '0.2s' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: editingItem.activo ? 20 : 2, transition: '0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowItemModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveItem} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 12px ${styles.orangeDim}` }}>Guardar Ítem</button>
            </div>
          </div>
        </div>
      )}

      {showModGrupoModal && editingModGrupo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModGrupoModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingModGrupo.id ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
                <p style={{ margin: 0, fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>Grupo de modificadores</p>
              </div>
              <button onClick={() => setShowModGrupoModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>NOMBRE DEL GRUPO</label>
                <input 
                  value={editingModGrupo.nombre || ''} 
                  onChange={e => setEditingModGrupo({ ...editingModGrupo, nombre: e.target.value })} 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} 
                  placeholder="Ej. Elige tu Contorno"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>COMPORTAMIENTO / TIPO</label>
                <select 
                  value={editingModGrupo.tipo || ''} 
                  onChange={e => setEditingModGrupo({ ...editingModGrupo, tipo: e.target.value as any })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14, appearance: 'none' }}
                >
                  <option value="contorno">Requerido (Contornos forzados)</option>
                  <option value="extra">Opcional (Extras con Precio)</option>
                  <option value="sin">Opcional (Sin Aderezos)</option>
                  <option value="seleccion">Libre Selección (Toppings)</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>MÍNIMO</label>
                  <input 
                    type="number"
                    value={editingModGrupo.min_selections} 
                    onChange={e => setEditingModGrupo({ ...editingModGrupo, min_selections: parseInt(e.target.value) || 0 })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>MÁXIMO</label>
                  <input 
                    type="number"
                    value={editingModGrupo.max_selections} 
                    onChange={e => setEditingModGrupo({ ...editingModGrupo, max_selections: parseInt(e.target.value) || 1 })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} 
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModGrupoModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveModGrupo} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 12px ${styles.orangeDim}` }}>Guardar Grupo</button>
            </div>
          </div>
        </div>
      )}

      {showModificadorModal && editingModificador && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModificadorModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingModificador.id ? 'Editar Modificador' : 'Nuevo Modificador'}</h3>
                <p style={{ margin: 0, fontSize: 11, color: styles.textDim, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>Elemento opcional o extra</p>
              </div>
              <button onClick={() => setShowModificadorModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>NOMBRE DEL MODIFICADOR</label>
                <input 
                  value={editingModificador.nombre || ''} 
                  onChange={e => setEditingModificador({ ...editingModificador, nombre: e.target.value })} 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} 
                  placeholder="Ej. Queso Extra"
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>GRUPO AL QUE PERTENECE</label>
                  <select 
                    value={editingModificador.grupo_id || ''} 
                    onChange={e => setEditingModificador({ ...editingModificador, grupo_id: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14, appearance: 'none' }}
                  >
                    <option value="">Selecciona uno...</option>
                    {modGrupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>PRECIO ADIC. ($)</label>
                  <input 
                    type="number" step="0.01"
                    value={editingModificador.precio_adicional === 0 ? '' : editingModificador.precio_adicional} 
                    onChange={e => setEditingModificador({ ...editingModificador, precio_adicional: parseFloat(e.target.value) || 0 })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.blue, fontSize: 14, fontWeight: 'bold' }} 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: styles.surface2, borderRadius: 8, border: `1px solid ${styles.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: styles.text, fontWeight: 600 }}>Disponible</div>
                  <div style={{ fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace' }}>Mostrar en el tablet del mesero</div>
                </div>
                <div 
                  onClick={() => setEditingModificador({ ...editingModificador, activo: !editingModificador.activo })}
                  style={{ width: 40, height: 22, borderRadius: 11, background: editingModificador.activo ? styles.orange : styles.border, position: 'relative', cursor: 'pointer', transition: '0.2s' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: editingModificador.activo ? 20 : 2, transition: '0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModificadorModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveModificador} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 12px ${styles.orangeDim}` }}>Guardar Modificador</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && editingCategory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCategoryModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingCategory.id ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              </div>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>NOMBRE</label>
                  <input value={editingCategory.nombre || ''} onChange={e => setEditingCategory({ ...editingCategory, nombre: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} placeholder="Pizzas" />
                </div>
                <div style={{ width: 60 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>EMOJI</label>
                  <input value={editingCategory.emoji || ''} onChange={e => setEditingCategory({ ...editingCategory, emoji: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 0', textAlign: 'center', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 20 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>ORDEN / POSICIÓN</label>
                  <input type="number" value={editingCategory.orden} onChange={e => setEditingCategory({ ...editingCategory, orden: parseInt(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveCategory} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showSubGrupoModal && editingSubGrupo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSubGrupoModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingSubGrupo.id ? 'Editar Sub-grupo' : 'Nuevo Sub-grupo'}</h3>
              </div>
              <button onClick={() => setShowSubGrupoModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>NOMBRE</label>
                  <input value={editingSubGrupo.nombre || ''} onChange={e => setEditingSubGrupo({ ...editingSubGrupo, nombre: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} placeholder="Mediana" />
                </div>
                <div style={{ width: 60 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>EMOJI</label>
                  <input value={editingSubGrupo.emoji || ''} onChange={e => setEditingSubGrupo({ ...editingSubGrupo, emoji: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 0', textAlign: 'center', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 20 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>CATEGORÍA PADRE</label>
                <select value={editingSubGrupo.categoria_id || ''} onChange={e => setEditingSubGrupo({ ...editingSubGrupo, categoria_id: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14, appearance: 'none' }}>
                  <option value="">Selecciona una...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSubGrupoModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveSubGrupo} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showMetodoModal && editingMetodo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowMetodoModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: styles.surface, borderRadius: 16, border: `1px solid ${styles.border}`, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${styles.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Fraunces, serif', color: styles.text }}>{editingMetodo.id ? 'Editar Método' : 'Nuevo Método de Pago'}</h3>
              </div>
              <button onClick={() => setShowMetodoModal(false)} style={{ background: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>ETIQUETA (LABEL)</label>
                  <input value={editingMetodo.label || ''} onChange={e => setEditingMetodo({ ...editingMetodo, label: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} placeholder="Zelle" />
                </div>
                <div style={{ width: 60 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>EMOJI</label>
                  <input value={editingMetodo.emoji || ''} onChange={e => setEditingMetodo({ ...editingMetodo, emoji: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 0', textAlign: 'center', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 20 }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>IDENTIFICADOR ÚNICO</label>
                  <input value={editingMetodo.identificador || ''} onChange={e => setEditingMetodo({ ...editingMetodo, identificador: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 14 }} placeholder="zelle-main" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 10, color: styles.textDim, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>MONEDA</label>
                  <select value={editingMetodo.moneda || 'usd'} onChange={e => setEditingMetodo({ ...editingMetodo, moneda: e.target.value as any })} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px', background: styles.surface2, border: `1px solid ${styles.border}`, borderRadius: 8, color: styles.text, fontSize: 13, appearance: 'none' }}>
                    <option value="usd">Dólares ($)</option>
                    <option value="bs">Bolívares (Bs)</option>
                    <option value="eur">Euros (€)</option>
                    <option value="mxn">Pesos (MXN)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: styles.surface2, borderRadius: 8, border: `1px solid ${styles.border}` }}>
                <div style={{ fontSize: 13, color: styles.text, fontWeight: 600 }}>Método Activo</div>
                <div onClick={() => setEditingMetodo({ ...editingMetodo, activo: !editingMetodo.activo })} style={{ width: 40, height: 22, borderRadius: 11, background: editingMetodo.activo ? styles.orange : styles.border, position: 'relative', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: editingMetodo.activo ? 20 : 2, transition: '0.2s' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${styles.border}`, background: styles.surface2, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMetodoModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${styles.border}`, background: 'transparent', color: styles.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveMetodo} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: styles.orange, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar Método</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}