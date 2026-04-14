'use client'
import { useState, useEffect } from 'react'
import type { License } from '@/types'
import { supabase } from '@/lib/supabase.client'

interface MenuModifier {
  id: string
  nombre: string
  emoji: string
  tipo: 'extra' | 'sin' | 'contorno' | 'sabor' | 'variante' | 'preferencia'
  costo: number
}

interface MenuVariant {
  id: string
  nombre: string
  emoji: string
  precio: number
}

interface MenuItemFull {
  id: string
  nombre: string
  cat: string
  precio: number
  activo: boolean
  emoji: string
  agotado?: boolean
  variantes?: MenuVariant[]
  mods_forzados?: MenuModifier[]
  mods_opcionales?: MenuModifier[]
  forzarContornos?: boolean
}

interface MenuCategory {
  id: string
  nombre: string
  emoji: string
  usaSubgrupos?: boolean
  subgrupos?: Subgrupo[]
}

interface Subgrupo {
  id: string
  nombre: string
  emoji: string
  precio: number | null
}

const CATEGORIAS: MenuCategory[] = [
  { id: 'entradas', nombre: 'Entradas', emoji: '🥗' },
  { id: 'pizzas', nombre: 'Pizzas', emoji: '🍕', usaSubgrupos: true, subgrupos: [
    { id: 'pch', nombre: 'Chica', emoji: '🍕', precio: null },
    { id: 'pme', nombre: 'Mediana', emoji: '🍕🍕', precio: null },
    { id: 'pgr', nombre: 'Grande', emoji: '🍕🍕🍕', precio: null },
  ]},
  { id: 'comidas', nombre: 'Comidas', emoji: '🍽️' },
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
  { id: 'postres', nombre: 'Postres', emoji: '🍰' },
  { id: 'cocteles', nombre: 'Cócteles', emoji: '🍹' },
  { id: 'hamburguesas', nombre: 'Hamburguesas', emoji: '🍔' },
  { id: 'tacos', nombre: 'Tacos', emoji: '🌮', usaSubgrupos: true, subgrupos: [
    { id: 'tac2', nombre: '2 tacos', emoji: '🌮🌮', precio: null },
    { id: 'tac3', nombre: '3 tacos', emoji: '🌮🌮🌮', precio: null },
    { id: 'tac5', nombre: '5 tacos', emoji: '🌮🌮🌮🌮🌮', precio: null },
  ]},
  { id: 'sopas', nombre: 'Sopas', emoji: '🍲' },
]

const DEMO_MENU: MenuItemFull[] = [
  { id: '1', nombre: 'Café Americano', cat: 'bebidas', precio: 3.50, activo: true, emoji: '☕',
    variantes: [
      { id: 'cf-a', nombre: 'Americano', emoji: '☕', precio: 3.50 },
      { id: 'cf-e', nombre: 'Espresso', emoji: '☕', precio: 3.00 },
      { id: 'cf-l', nombre: 'Latte', emoji: '🥛', precio: 4.50 },
      { id: 'cf-c', nombre: 'Cappuccino', emoji: '☕', precio: 4.50 },
    ],
    mods_opcionales: [
      { id: 'cfo1', nombre: 'Extra azúcar', emoji: '🍬', tipo: 'extra', costo: 0 },
      { id: 'cfo2', nombre: 'Sin azúcar', emoji: '❌', tipo: 'sin', costo: 0 },
    ]
  },
  { id: '2', nombre: 'Chocolate Caliente', cat: 'bebidas', precio: 4.00, activo: true, emoji: '🍫',
    mods_opcionales: [
      { id: 'ch1', nombre: 'Extra crema', emoji: '🥛', tipo: 'extra', costo: 0.5 },
    ]
  },
  { id: '3', nombre: 'Jugo de Naranja', cat: 'bebidas', precio: 4.00, activo: true, emoji: '🍊' },
  { id: '4', nombre: 'Limonada', cat: 'bebidas', precio: 3.50, activo: true, emoji: '🍋' },
  { id: '5', nombre: 'Mojito', cat: 'cocteles', precio: 10.00, activo: true, emoji: '🍹',
    variantes: [
      { id: 'moj-r', nombre: 'Regular', emoji: '🍹', precio: 10 },
      { id: 'moj-d', nombre: 'Doble', emoji: '🍹🍹', precio: 16 },
    ],
    mods_forzados: [
      { id: 'moj-s', nombre: 'Con alcohol', emoji: '🥃', tipo: 'variante', costo: 0 },
      { id: 'moj-v', nombre: 'Virgin (sin alcohol)', emoji: '🍋', tipo: 'variante', costo: -2 },
    ],
    mods_opcionales: [
      { id: 'mojo1', nombre: 'Extra menta', emoji: '🌿', tipo: 'extra', costo: 0 },
      { id: 'mojo2', nombre: 'Extra limón', emoji: '🍋', tipo: 'extra', costo: 0 },
    ]
  },
  { id: '6', nombre: 'Piña Colada', cat: 'cocteles', precio: 11.00, activo: true, emoji: '🍹',
    variantes: [
      { id: 'pc-r', nombre: 'Regular', emoji: '🍹', precio: 11 },
      { id: 'pc-d', nombre: 'Doble', emoji: '🍹🍹', precio: 18 },
    ],
    mods_forzados: [
      { id: 'pc-a', nombre: 'Con alcohol', emoji: '🥃', tipo: 'variante', costo: 0 },
      { id: 'pc-v', nombre: 'Virgin', emoji: '🍍', tipo: 'variante', costo: -2 },
    ],
    mods_opcionales: []
  },
  { id: '7', nombre: 'Margarita', cat: 'cocteles', precio: 12.00, activo: true, emoji: '🍸',
    variantes: [
      { id: 'mar-cl', nombre: 'Clásica', emoji: '🍸', precio: 12 },
      { id: 'mar-fr', nombre: 'Frozen', emoji: '🧊', precio: 13 },
    ],
    mods_forzados: [
      { id: 'mar-a', nombre: 'Con alcohol', emoji: '🥃', tipo: 'variante', costo: 0 },
      { id: 'mar-v', nombre: 'Sin alcohol', emoji: '🍋', tipo: 'variante', costo: -2 },
    ],
    mods_opcionales: [
      { id: 'maro1', nombre: 'Con sal', emoji: '🧂', tipo: 'extra', costo: 0 },
      { id: 'maro2', nombre: 'Sin sal', emoji: '❌', tipo: 'sin', costo: 0 },
    ]
  },
  { id: '8', nombre: 'Pizza Margarita', cat: 'pizzas', precio: 12.00, activo: true, emoji: '🍕',
    variantes: [
      { id: 'pch', nombre: 'Chica', emoji: '🍕', precio: 12 },
      { id: 'pme', nombre: 'Mediana', emoji: '🍕🍕', precio: 16 },
      { id: 'pgr', nombre: 'Grande', emoji: '🍕🍕🍕', precio: 20 },
      { id: 'pfa', nombre: 'Familiar', emoji: '🍕🍕🍕🍕', precio: 26 },
    ],
    mods_forzados: [
      { id: 'pmb1', nombre: 'Masa Delgada', emoji: '🫓', tipo: 'variante', costo: 0 },
      { id: 'pmb2', nombre: 'Masa Gruesa', emoji: '🍞', tipo: 'variante', costo: 0 },
      { id: 'pmb3', nombre: 'Masa de Queso', emoji: '🧀', tipo: 'variante', costo: 2 },
    ],
    mods_opcionales: [
      { id: 'pe1', nombre: 'Extra queso', emoji: '🧀', tipo: 'extra', costo: 2 },
      { id: 'pe2', nombre: 'Sin tomate', emoji: '🍅', tipo: 'sin', costo: 0 },
      { id: 'pe3', nombre: 'Extra albahaca', emoji: '🌿', tipo: 'extra', costo: 0.5 },
    ]
  },
  { id: '9', nombre: 'Pizza Pepperoni', cat: 'pizzas', precio: 14.00, activo: true, emoji: '🍕',
    variantes: [
      { id: 'pp-ch', nombre: 'Chica', emoji: '🍕', precio: 14 },
      { id: 'pp-me', nombre: 'Mediana', emoji: '🍕🍕', precio: 18 },
      { id: 'pp-gr', nombre: 'Grande', emoji: '🍕🍕🍕', precio: 22 },
    ],
    mods_forzados: [
      { id: 'ppb1', nombre: 'Masa Delgada', emoji: '🫓', tipo: 'variante', costo: 0 },
      { id: 'ppb2', nombre: 'Masa Gruesa', emoji: '🍞', tipo: 'variante', costo: 0 },
    ],
    mods_opcionales: [
      { id: 'ppe1', nombre: 'Extra pepperoni', emoji: '🍕', tipo: 'extra', costo: 2.5 },
      { id: 'ppe2', nombre: 'Sin cebolla', emoji: '🧅', tipo: 'sin', costo: 0 },
      { id: 'ppe3', nombre: 'Extra queso', emoji: '🧀', tipo: 'extra', costo: 2 },
    ]
  },
  { id: '10', nombre: 'Ensalada César', cat: 'entradas', precio: 14.00, activo: true, emoji: '🥗',
    mods_opcionales: [
      { id: 'sf1', nombre: 'Sin anchoas', emoji: '🐟', tipo: 'sin', costo: 0 },
      { id: 'sf2', nombre: 'Sin crutones', emoji: '🍞', tipo: 'sin', costo: 0 },
      { id: 'so1', nombre: 'Extra parmesano', emoji: '🧀', tipo: 'extra', costo: 1.5 },
    ]
  },
  { id: '11', nombre: 'Hamburguesa Clásica', cat: 'hamburguesas', precio: 15.00, activo: true, emoji: '🍔',
    variantes: [
      { id: 'hbs', nombre: 'Sencilla', emoji: '🍔', precio: 15 },
      { id: 'hbd', nombre: 'Doble', emoji: '🍔🍔', precio: 20 },
    ],
    mods_forzados: [
      { id: 'hb1', nombre: 'Papas fritas', emoji: '🍟', tipo: 'contorno', costo: 0 },
      { id: 'hb2', nombre: 'Aros cebolla', emoji: '🧅', tipo: 'contorno', costo: 1.5 },
      { id: 'hb3', nombre: 'Ensalada', emoji: '🥗', tipo: 'contorno', costo: 0 },
    ],
    mods_opcionales: [
      { id: 'hbo1', nombre: 'Extra queso', emoji: '🧀', tipo: 'extra', costo: 1.5 },
      { id: 'hbo2', nombre: 'Sin tomate', emoji: '🍅', tipo: 'sin', costo: 0 },
      { id: 'hbo3', nombre: 'Extra bacon', emoji: '🥓', tipo: 'extra', costo: 2 },
    ]
  },
  { id: '12', nombre: 'Burger BBQ', cat: 'hamburguesas', precio: 17.00, activo: true, emoji: '🍔',
    variantes: [
      { id: 'bbqs', nombre: 'Sencilla', emoji: '🍔', precio: 17 },
      { id: 'bbqd', nombre: 'Doble', emoji: '🍔🍔', precio: 23 },
    ],
    mods_forzados: [
      { id: 'bbq1', nombre: 'Papas fritas', emoji: '🍟', tipo: 'contorno', costo: 0 },
      { id: 'bbq2', nombre: 'Aros cebolla', emoji: '🧅', tipo: 'contorno', costo: 1 },
    ],
    mods_opcionales: [
      { id: 'bbqo1', nombre: 'Extra BBQ', emoji: '🫙', tipo: 'extra', costo: 0 },
      { id: 'bbqo2', nombre: 'Sin cebolla', emoji: '🧅', tipo: 'sin', costo: 0 },
    ]
  },
  { id: '13', nombre: 'Tacos de Carne', cat: 'tacos', precio: 12.00, activo: true, emoji: '🌮',
    variantes: [
      { id: 'tac2', nombre: '2 tacos', emoji: '🌮🌮', precio: 12 },
      { id: 'tac3', nombre: '3 tacos', emoji: '🌮🌮🌮', precio: 16 },
      { id: 'tac5', nombre: '5 tacos', emoji: '🌮🌮🌮🌮🌮', precio: 24 },
    ],
    mods_forzados: [
      { id: 'tac-s', nombre: 'Tortilla maíz', emoji: '🫓', tipo: 'variante', costo: 0 },
      { id: 'tac-h', nombre: 'Tortilla harina', emoji: '🫓', tipo: 'variante', costo: 0 },
    ],
    mods_opcionales: [
      { id: 'taco1', nombre: 'Extra guacamole', emoji: '🥑', tipo: 'extra', costo: 1.5 },
      { id: 'taco2', nombre: 'Sin cilantro', emoji: '🌿', tipo: 'sin', costo: 0 },
      { id: 'taco3', nombre: 'Extra salsa', emoji: '🌶️', tipo: 'extra', costo: 0 },
    ]
  },
  { id: '14', nombre: 'Pasta Alfredo', cat: 'comidas', precio: 16.00, activo: true, emoji: '🍝',
    variantes: [
      { id: 'paf-p', nombre: 'Regular', emoji: '🍝', precio: 16 },
      { id: 'paf-g', nombre: 'Grande', emoji: '🍝🍝', precio: 20 },
    ],
    mods_forzados: [
      { id: 'pfc1', nombre: 'Papas fritas', emoji: '🍟', tipo: 'contorno', costo: 0 },
      { id: 'pfc2', nombre: 'Ensalada verde', emoji: '🥗', tipo: 'contorno', costo: 0 },
      { id: 'pfc3', nombre: 'Pan de ajo', emoji: '🧄', tipo: 'contorno', costo: 1 },
    ],
    mods_opcionales: [
      { id: 'pao1', nombre: 'Extra crema', emoji: '🥛', tipo: 'extra', costo: 1 },
      { id: 'pao2', nombre: 'Sin champiñones', emoji: '🍄', tipo: 'sin', costo: 0 },
      { id: 'pao3', nombre: 'Con pollo', emoji: '🍗', tipo: 'extra', costo: 3 },
    ]
  },
  { id: '15', nombre: 'Tiramisú', cat: 'postres', precio: 8.00, activo: true, emoji: '🍰',
    mods_opcionales: [
      { id: 'do1', nombre: 'Extra crema', emoji: '🥛', tipo: 'extra', costo: 1 },
      { id: 'do2', nombre: 'Sin café', emoji: '☕', tipo: 'sin', costo: 0 },
    ]
  },
  { id: '16', nombre: 'Helado 3 bolas', cat: 'postres', precio: 6.00, activo: true, emoji: '🍨',
    mods_forzados: [
      { id: 'hf1', nombre: 'Vainilla', emoji: '🤍', tipo: 'sabor', costo: 0 },
      { id: 'hf2', nombre: 'Chocolate', emoji: '🍫', tipo: 'sabor', costo: 0 },
      { id: 'hf3', nombre: 'Fresa', emoji: '🍓', tipo: 'sabor', costo: 0 },
      { id: 'hf4', nombre: 'Pistacchio', emoji: '🟢', tipo: 'sabor', costo: 0.5 },
    ],
    mods_opcionales: [
      { id: 'ho1', nombre: 'Salsa chocolate', emoji: '🍫', tipo: 'extra', costo: 0.5 },
      { id: 'ho2', nombre: 'Salsa caramelo', emoji: '🍯', tipo: 'extra', costo: 0.5 },
      { id: 'ho3', nombre: 'Fresas encima', emoji: '🍓', tipo: 'extra', costo: 1 },
    ]
  },
]

const DEMO_USERS = [
  { pin: '1234', nombre: 'Admin Principal', nivel: 1, rol: 'admin', color: '#ff7c20' },
  { pin: '5678', nombre: 'Cajero Demo', nivel: 2, rol: 'cajero', color: '#38b6ff' },
  { pin: '9012', nombre: 'Mesero Demo', nivel: 3, rol: 'mesero', color: '#2ee87a' },
  { pin: '3456', nombre: 'Supervisor', nivel: 4, rol: 'supervisor', color: '#a855f7' },
]

const AMBIENTES = [
  { id: 'salon', nombre: 'Salón', emoji: '🏛️' },
  { id: 'vip', nombre: 'VIP', emoji: '⭐' },
  { id: 'terraza', nombre: 'Terraza', emoji: '🌿' },
  { id: 'privado', nombre: 'Privado', emoji: '🔒' },
  { id: 'barra', nombre: 'Barra', emoji: '🍺' },
]

const FORMAS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'zelle', label: 'Zelle', icon: '📱' },
  { id: 'pago-movil', label: 'Pago Móvil', icon: '📲' },
  { id: 'divisa', label: 'Divisa', icon: '💲' },
  { id: 'credito', label: 'Crédito', icon: '📋' },
]

type TableStatus = 'libre' | 'ocupada' | 'cuenta' | 'reservada' | 'deuda'
type View = 'login' | 'destino' | 'mesas' | 'comanda' | 'admin'
type MenuStep = 'cats' | 'subgrupo' | 'prods' | 'variants' | 'mods-forced' | 'mods-optional' | 'qty'

interface Table {
  id: string
  numero: number
  nombre: string
  ambiente: string
  capacidad: number
  estado: TableStatus
  pedido?: OrderItem[]
  cliente?: string
  monto?: number
  opened?: Date
}

interface OrderItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
  modificadores?: MenuModifier[]
  modsForced?: MenuModifier[]
  modsOptional?: MenuModifier[]
  variante?: string
  nota?: string
  enviado?: boolean
  uid: string
}


export default function POSRestaurant({ license }: { license: License }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentView, setCurrentView] = useState<View>('mesas')
  const [currentAmbiente, setCurrentAmbiente] = useState('salon')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [currentCat, setCurrentCat] = useState<string>('')
  const [currentSubgrupo, setCurrentSubgrupo] = useState<Subgrupo | null>(null)
  const [menuStep, setMenuStep] = useState<MenuStep>('cats')
  const [selectedProduct, setSelectedProduct] = useState<MenuItemFull | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(null)
  const [modsForced, setModsForced] = useState<MenuModifier[]>([])
  const [modsOptional, setModsOptional] = useState<MenuModifier[]>([])
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [showCobrar, setShowCobrar] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('efectivo')
  const [pin, setPin] = useState('')
  const [currentUser, setCurrentUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const [showAuthOverlay, setShowAuthOverlay] = useState(false)
  const [authCallback, setAuthCallback] = useState<(() => void) | null>(null)
  const [tasaBCV, setTasaBCV] = useState(36.50)
  const [adminView, setAdminView] = useState<'menu' | 'reportes' | 'creditos' | 'usuarios' | 'config'>('menu')
  const [showCorteX, setShowCorteX] = useState(false)
  const [showCorteZ, setShowCorteZ] = useState(false)
  const [showFuncionesMesa, setShowFuncionesMesa] = useState(false)
  const [showCliente, setShowCliente] = useState(false)
  const [showDividir, setShowDividir] = useState(false)
  const [showNotaConsumo, setShowNotaConsumo] = useState(false)
  const [showFunciones, setShowFunciones] = useState(false)

  const [items] = useState<MenuItemFull[]>(DEMO_MENU)
  const [categories] = useState<MenuCategory[]>(CATEGORIAS)
  const loading = false

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const mockTables: Table[] = []
    const counts: Record<string, number> = { salon: 8, vip: 4, terraza: 6, privado: 2, barra: 5 }
    let num = 1
    Object.entries(counts).forEach(([amb, count]) => {
      for (let i = 0; i < count; i++) {
        const estados: TableStatus[] = ['libre', 'libre', 'libre', 'ocupada', 'cuenta']
        const estado = estados[Math.floor(Math.random() * estados.length)]
        mockTables.push({
          id: `M${num}`,
          numero: num,
          nombre: `Mesa ${num}`,
          ambiente: amb,
          capacidad: 4,
          estado,
          pedido: estado === 'ocupada' || estado === 'cuenta' ? [
            { id: '1', uid: '1_demo', nombre: 'Café Americano', precio: 3.50, cantidad: 2, enviado: true },
            { id: '2', uid: '2_demo', nombre: 'Croissant', precio: 2.50, cantidad: 1, enviado: true },
          ] : undefined,
          monto: estado === 'cuenta' ? 9.50 : undefined,
        })
        num++
      }
    })
    setTables(mockTables)
  }, [])

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'libre': return { bg: 'transparent', border: colors.border, text: colors.textDim }
      case 'ocupada': return { bg: colors.blueDim, border: colors.blueB, text: colors.blue }
      case 'cuenta': return { bg: colors.orangeDim, border: colors.orangeB, text: colors.orange }
      case 'reservada': return { bg: colors.purpleDim, border: colors.purpleB, text: colors.purple }
      case 'deuda': return { bg: colors.redDim, border: colors.redB, text: colors.red }
    }
  }

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'libre': return 'LIBRE'
      case 'ocupada': return 'OCUPADA'
      case 'cuenta': return 'PAGAR'
      case 'reservada': return 'RESERVADA'
      case 'deuda': return 'CRÉDITO'
    }
  }

  const colors = {
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
    blue: '#38b6ff',
    blueDim: 'rgba(56,182,255,0.1)',
    blueB: 'rgba(56,182,255,0.25)',
    purple: '#a855f7',
    purpleDim: 'rgba(168,85,247,0.1)',
    purpleB: 'rgba(168,85,247,0.25)',
    red: '#ff4757',
    redDim: 'rgba(255,71,87,0.12)',
    redB: 'rgba(255,71,87,0.25)',
    cyan: '#00d4ff',
    amber: '#ffc040',
  }

  const filteredTables = tables.filter(t => t.ambiente === currentAmbiente)
  const activeTables = tables.filter(t => t.estado === 'ocupada').length
  
  const filteredItems = currentCat 
    ? items.filter(i => i.cat === currentCat && i.activo && !i.agotado)
    : items.filter(i => i.activo && !i.agotado)

  const getProductPrice = (product: MenuItemFull): number => {
    if (selectedVariant) return selectedVariant.precio
    if (currentSubgrupo && product.variantes) {
      const v = product.variantes.find(v => v.id === currentSubgrupo?.id)
      if (v) return v.precio
    }
    return product.precio
  }

  const getExtraCost = (): number => {
    return [...modsOptional, ...modsForced].reduce((sum, m) => sum + m.costo, 0)
  }

  const currentOrder = selectedTable?.pedido || []
  const orderTotal = currentOrder.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  const handleTableClick = (table: Table) => {
    let targetTable = table
    if (table.estado === 'libre') {
      targetTable = { ...table, estado: 'ocupada' as TableStatus, pedido: [], opened: new Date() }
      const updated = tables.map(t => t.id === table.id ? targetTable : t)
      setTables(updated)
    }
    setSelectedTable(targetTable)
    setCurrentView('comanda')
  }

  const selectCat = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    setCurrentCat(catId)
    if (cat?.usaSubgrupos && cat.subgrupos?.length) {
      setCurrentSubgrupo(null)
      setMenuStep('subgrupo')
    } else {
      setCurrentSubgrupo(null)
      setMenuStep('prods')
    }
  }

  const selectSubgrupo = (subgrupo: Subgrupo) => {
    setCurrentSubgrupo(subgrupo)
    setMenuStep('prods')
  }

  const selectProduct = (product: MenuItemFull) => {
    setSelectedProduct(product)
    setSelectedVariant(null)
    setModsForced([])
    setModsOptional([])
    setQty(1)
    setNote('')
    
    if (product.variantes && product.variantes.length) {
      setMenuStep('variants')
    } else if (hasForzados(product)) {
      setMenuStep('mods-forced')
    } else if (product.mods_opcionales?.length) {
      setMenuStep('mods-optional')
    } else {
      setMenuStep('qty')
    }
  }

  const hasForzados = (product: MenuItemFull): boolean => {
    return !!(product.mods_forzados?.length && product.forzarContornos !== false)
  }

  const selectVariant = (variant: MenuVariant) => {
    setSelectedVariant(variant)
    if (selectedProduct && hasForzados(selectedProduct)) {
      setMenuStep('mods-forced')
    } else if (selectedProduct?.mods_opcionales?.length) {
      setMenuStep('mods-optional')
    } else {
      setMenuStep('qty')
    }
  }

  const toggleModForced = (mod: MenuModifier) => {
    setModsForced(prev => {
      const exists = prev.find(m => m.id === mod.id)
      if (exists) return prev.filter(m => m.id !== mod.id)
      return [...prev, mod]
    })
  }

  const toggleModOptional = (mod: MenuModifier) => {
    setModsOptional(prev => {
      const exists = prev.find(m => m.id === mod.id)
      if (exists) return prev.filter(m => m.id !== mod.id)
      return [...prev, mod]
    })
  }

  const proceedFromModsForced = () => {
    if (selectedProduct?.mods_opcionales?.length) {
      setMenuStep('mods-optional')
    } else {
      setMenuStep('qty')
    }
  }

  const proceedFromModsOptional = () => {
    setMenuStep('qty')
  }

  const addToOrder = (item: MenuItemFull) => {
    selectProduct(item)
  }

  const confirmItem = () => {
    if (!selectedTable || !selectedProduct) return
    
    const basePrice = getProductPrice(selectedProduct)
    const extraCost = getExtraCost()
    const totalPrice = basePrice + extraCost
    
    let itemName = selectedProduct.nombre
    if (currentSubgrupo) {
      itemName += ` · ${currentSubgrupo.nombre}`
    } else if (selectedVariant) {
      itemName += ` · ${selectedVariant.nombre}`
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      uid: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      nombre: itemName,
      precio: totalPrice,
      cantidad: qty,
      modsForced: [...modsForced],
      modsOptional: [...modsOptional],
      variante: currentSubgrupo?.nombre || selectedVariant?.nombre || undefined,
      nota: note || undefined,
      enviado: false,
    }

    const updatedTable = { ...selectedTable, pedido: [...(selectedTable.pedido || []), newItem] }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
    
    setTables(updatedTables)
    setSelectedTable(updatedTable)
    
    if (currentSubgrupo) {
      setMenuStep('prods')
    } else {
      setMenuStep('cats')
    }
    setSelectedProduct(null)
    setSelectedVariant(null)
    setModsForced([])
    setModsOptional([])
    setNote('')
  }

  const handlePinSubmit = () => {
    const user = DEMO_USERS.find(u => u.pin === pin)
    if (user) {
      setCurrentUser(user)
      setPin('')
      setCurrentView('destino')
    }
  }

  const handleAuthAction = (callback: () => void) => {
    if (currentUser?.nivel === 1) {
      callback()
    } else {
      setAuthCallback(() => callback)
      setShowAuthOverlay(true)
    }
  }

  const confirmAuth = () => {
    const user = DEMO_USERS.find(u => u.pin === pin)
    if (user && user.nivel <= 2) {
      if (authCallback) authCallback()
      setShowAuthOverlay(false)
      setPin('')
      setAuthCallback(null)
    }
  }

  const orderTotalBs = orderTotal * tasaBCV

  const renderLoginView = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg }}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '32px 40px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.text, marginBottom: 6 }}>POS Restaurant</div>
        <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 28, fontFamily: 'DM Mono, monospace' }}>Ingresa tu PIN</div>
        
        <div style={{ background: colors.surface2, border: `2px solid ${colors.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, letterSpacing: 8, color: colors.text, minWidth: 140, textAlign: 'center' }}>
            {pin.replace(/./g, '●')}
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => setPin(p => p.length < 4 ? p + n.toString() : p)}
              style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 20, fontWeight: 600, cursor: 'pointer' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.redDim, color: colors.red, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            ✕
          </button>
          <button
            onClick={() => setPin(p => p.length < 4 ? p + '0' : p)}
            style={{ padding: '16px 0', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 20, fontWeight: 600, cursor: 'pointer' }}
          >
            0
          </button>
          <button
            onClick={handlePinSubmit}
            style={{ padding: '16px 0', borderRadius: 10, border: 'none', background: colors.green, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            ✓
          </button>
        </div>
        
        <div style={{ fontSize: 10, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
          <div>Demo: 1234=Admin, 5678=Cajero, 9012=Mesero</div>
        </div>
      </div>
    </div>
  )

  const renderDestinoView = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg, gap: 24, padding: 40 }}>
      <div
        onClick={() => { setCurrentView('mesas') }}
        style={{ width: 280, height: 320, borderRadius: 20, border: `3px solid ${colors.orange}`, background: colors.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transition: 'all 0.2s' }}
      >
        <div style={{ fontSize: 64 }}>🍽️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: colors.text }}>POS</div>
        <div style={{ fontSize: 12, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>Punto de Venta</div>
      </div>
      <div
        onClick={() => { setCurrentView('admin') }}
        style={{ width: 280, height: 320, borderRadius: 20, border: `3px solid ${colors.blue}`, background: colors.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transition: 'all 0.2s' }}
      >
        <div style={{ fontSize: 64 }}>⚙️</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: colors.text }}>Admin</div>
        <div style={{ fontSize: 12, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>Administración</div>
      </div>
    </div>
  )

  const renderAuthOverlay = () => {
    if (!showAuthOverlay) return null
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border2}`, borderRadius: 14, padding: '24px 32px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 16 }}>Autenticación</div>
          <div style={{ background: colors.surface2, border: `2px solid ${colors.orange}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 24, letterSpacing: 8, color: colors.text, textAlign: 'center', outline: 'none', fontFamily: 'DM Mono, monospace' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAuthOverlay(false); setPin('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmAuth} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: colors.green, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirmar</button>
          </div>
        </div>
      </div>
    )
  }

  const updateItemQty = (itemUid: string, delta: number) => {
    if (!selectedTable) return
    
    const pedido = selectedTable.pedido?.map(item => {
      if (item.uid === itemUid) {
        const newQty = item.cantidad + delta
        return newQty > 0 ? { ...item, cantidad: newQty } : null
      }
      return item
    }).filter(Boolean) as OrderItem[] | undefined

    const updatedTable = { ...selectedTable, pedido }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
    
    setTables(updatedTables)
    setSelectedTable(updatedTable)
  }

  const sendToKitchen = async () => {
    if (!selectedTable || !selectedTable.pedido?.length) return
    
    const saleId = 'S' + Date.now()
    const iva = orderTotal * 0.1
    const { error } = await supabase.from('ventas').insert({
      id: saleId,
      tenant_id: 'demo-tenant',
      mesa: selectedTable.numero.toString(),
      total: orderTotal,
      iva,
      igtf: 0,
      items: selectedTable.pedido.map(i => ({
        itemId: i.id,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        modificadores: i.modificadores,
        nota: i.nota,
        subtotal: i.precio * i.cantidad,
      })),
      cajero: currentUser?.nombre || 'Demo',
      created_at: new Date().toISOString(),
      tipo: 'venta',
    })

    if (error) {
      console.error('Error enviando a cocina:', error)
      return
    }

    const updatedTable = { ...selectedTable, pedido: selectedTable.pedido.map(i => ({ ...i, enviado: true })) }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
    setTables(updatedTables)
    setSelectedTable(updatedTable)
  }

  const processPayment = async () => {
    if (!selectedTable) return
    
    const iva = orderTotal * 0.1
    const igtf = selectedPayment === 'divisa' ? orderTotal * 0.03 : 0
    const totalConImpuestos = orderTotal + iva + igtf

    const { error } = await supabase.from('ventas').insert({
      id: 'V' + Date.now(),
      tenant_id: 'demo-tenant',
      mesa: selectedTable.numero.toString(),
      total: totalConImpuestos,
      iva,
      igtf,
      formasPago: [{ tipo: selectedPayment, monto: totalConImpuestos, montoUSD: selectedPayment === 'divisa' ? totalConImpuestos : 0 }],
      items: selectedTable.pedido?.map(i => ({
        itemId: i.id,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        subtotal: i.precio * i.cantidad,
      })) || [],
      cajero: currentUser?.nombre || 'Demo',
      created_at: new Date().toISOString(),
      tipo: 'venta',
    })

    if (error) {
      console.error('Error procesando pago:', error)
      return
    }

    const updatedTable = { ...selectedTable, estado: 'libre' as TableStatus, pedido: [], monto: undefined }
    const updatedTables = tables.map(t => t.id === selectedTable.id ? updatedTable : t)
    setTables(updatedTables)
    setSelectedTable(null)
    setShowCobrar(false)
    setCurrentView('mesas')
  }

  const renderMesasView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 148px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ background: colors.topbar, borderRight: `2px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '12px 14px 6px', borderBottom: `1px solid ${colors.border}` }}>
          AMBIENTES
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {AMBIENTES.map(amb => (
            <div
              key={amb.id}
              onClick={() => setCurrentAmbiente(amb.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: 10, borderRadius: 8,
                cursor: 'pointer', border: '1px solid transparent', marginBottom: 3,
                background: currentAmbiente === amb.id ? colors.greenDim : 'transparent',
                borderColor: currentAmbiente === amb.id ? colors.greenB : 'transparent',
              }}
            >
              <span style={{ fontSize: 18 }}>{amb.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: currentAmbiente === amb.id ? colors.green : colors.text }}>
                  {amb.nombre}
                </div>
                <div style={{ fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
                  {tables.filter(t => t.ambiente === amb.id).length} mesas
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { color: colors.border2, label: 'Libre' },
            { color: colors.blue, label: 'Ocupada' },
            { color: colors.orange, label: 'Cuenta' },
            { color: colors.purple, label: 'Reservada' },
            { color: colors.red, label: 'Crédito' },
          ].map(ley => (
            <div key={ley.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ley.color }} />
              {ley.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bg, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.surface, flexShrink: 0 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text }}>
            {AMBIENTES.find(a => a.id === currentAmbiente)?.emoji} {AMBIENTES.find(a => a.id === currentAmbiente)?.nombre}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: colors.text }}>{activeTables}</span>
              <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim, letterSpacing: 1 }}>activas</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 14, overflow: 'auto', flex: 1, alignContent: 'start' }}>
          {filteredTables.map(table => {
            const statusStyle = getStatusColor(table.estado)
            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                style={{
                  borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                  border: `2px solid ${statusStyle.border}`, textAlign: 'center',
                  background: statusStyle.bg, width: '100%', minHeight: 100,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                onMouseUp={(e) => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
              >
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 900, lineHeight: 1, marginBottom: 1 }}>
                  {table.numero}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', color: statusStyle.text }}>
                  {getStatusLabel(table.estado)}
                </div>
                {table.monto !== undefined && (
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, marginTop: 2, color: colors.orange }}>
                    ${table.monto.toFixed(2)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#0f1923', borderLeft: '2px solid rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', flexShrink: 0, width: 148 }}>
        <div style={{ background: 'linear-gradient(180deg,#1e4a8c 0%,#163a74 100%)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>1</div>
          <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', zIndex: 1 }}>F1</div>
          <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1 }}>🧾</span>
          <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 1 }}>Reportes</span>
        </div>
        <div style={{ background: 'linear-gradient(180deg,#cc5500 0%,#aa4000 100%)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>2</div>
          <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', zIndex: 1 }}>F2</div>
          <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1 }}>💳</span>
          <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 1 }}>Cobrar</span>
        </div>
        <div style={{ background: 'linear-gradient(180deg,#1a6e3a 0%,#115a2a 100%)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>↵</div>
          <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', zIndex: 1 }}>ESC</div>
          <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1 }}>👨‍🍳</span>
          <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 1 }}>Cocina</span>
        </div>
        <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />
        <div style={{ background: 'linear-gradient(180deg,#d41428 0%,#aa0e20 100%)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-48%)', fontFamily: 'DM Sans', fontWeight: 900, fontSize: 68, letterSpacing: -4, color: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}>7</div>
          <div style={{ position: 'absolute', top: 5, left: 7, fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#fff', zIndex: 1 }}>F7</div>
          <span style={{ fontSize: 22, lineHeight: 1, zIndex: 1 }}>🗑️</span>
          <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 1 }}>Anular</span>
        </div>
      </div>
    </div>
  )

  const renderComandaView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.surface }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>MESA:</span>
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const t = tables.find(tbl => tbl.id === e.target.value)
                if (t) setSelectedTable(t)
              }}
              style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '7px 10px', color: colors.text, fontSize: 12, outline: 'none' }}
            >
              <option value="">— seleccionar —</option>
              {tables.filter(t => t.estado !== 'libre').map(t => (
                <option key={t.id} value={t.id}>Mesa {t.numero}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {menuStep !== 'cats' && (
              <button
                onClick={() => {
                  if (menuStep === 'qty') {
                    if (selectedProduct?.mods_opcionales?.length) setMenuStep('mods-optional')
                    else if (hasForzados(selectedProduct!)) setMenuStep('mods-forced')
                    else if (selectedProduct?.variantes?.length) setMenuStep('variants')
                    else setMenuStep('prods')
                  } else if (menuStep === 'mods-optional') setMenuStep(selectedProduct?.variantes?.length ? 'variants' : 'prods')
                  else if (menuStep === 'mods-forced') setMenuStep(selectedProduct?.variantes?.length ? 'variants' : 'prods')
                  else if (menuStep === 'variants') setMenuStep('prods')
                  else if (menuStep === 'prods') {
                    if (currentSubgrupo) setMenuStep('subgrupo')
                    else setMenuStep('cats')
                  }
                  else setMenuStep('cats')
                }}
                style={{ background: 'transparent', border: 'none', color: colors.textMid, fontSize: 12, cursor: 'pointer' }}
              >
                ← Atrás
              </button>
            )}
          </div>
        </div>

        {menuStep === 'cats' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              CATEGORÍAS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => selectCat(cat.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    padding: 10, borderRadius: 12, cursor: 'pointer', background: colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 100,
                    transition: 'all 0.13s',
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{cat.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'subgrupo' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              {categories.find(c => c.id === currentCat)?.nombre} — ELIGE UN TAMAÑO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {categories.find(c => c.id === currentCat)?.subgrupos?.map(sg => (
                <div
                  key={sg.id}
                  onClick={() => selectSubgrupo(sg)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: 12, borderRadius: 12, cursor: 'pointer', background: colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 100,
                    transition: 'all 0.13s',
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{sg.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{sg.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'prods' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim }}>
                {categories.find(c => c.id === currentCat)?.nombre}
                {currentSubgrupo ? ` — ${currentSubgrupo.nombre}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {loading && <div style={{ color: colors.textDim, textAlign: 'center', gridColumn: '1/-1', padding: 40 }}>Cargando...</div>}
              {!loading && filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    padding: 10, borderRadius: 10, cursor: 'pointer', background: colors.surface2,
                    border: `2px solid ${colors.border}`, textAlign: 'center', height: 90,
                    transition: 'all 0.13s',
                    opacity: item.agotado ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji || '🍽️'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxWidth: '100%' }}>
                    {item.nombre}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.orange, fontWeight: 700 }}>
                    ${item.precio.toFixed(2)}
                  </span>
                  {item.agotado && (
                    <span style={{ fontSize: 8, color: colors.red, fontFamily: 'DM Mono, monospace' }}>AGOTADO</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'variants' && selectedProduct && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              ELIGE UNA OPCIÓN — {selectedProduct.nombre}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {selectedProduct.variantes?.map(v => (
                <div
                  key={v.id}
                  onClick={() => selectVariant(v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: 10, borderRadius: 10, cursor: 'pointer', background: colors.surface2,
                    border: `2px solid ${selectedVariant?.id === v.id ? colors.orange : colors.border}`, textAlign: 'center', height: 90,
                    transition: 'all 0.13s',
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{v.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{v.nombre}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: colors.orange, fontWeight: 700 }}>
                    ${v.precio.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {menuStep === 'mods-forced' && selectedProduct && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.amber, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              ⚡ CONTORNOS / OBLIGATORIO — {selectedProduct.nombre}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {selectedProduct.mods_forzados?.map(mod => {
                const isSelected = modsForced.some(m => m.id === mod.id)
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModForced(mod)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      padding: 8, borderRadius: 9, cursor: 'pointer', background: isSelected ? colors.greenDim : colors.surface2,
                      border: `2px solid ${isSelected ? colors.greenB : colors.border}`, textAlign: 'center', height: 80,
                      transition: 'all 0.13s',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{mod.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{mod.nombre}</span>
                    {mod.costo > 0 && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.amber }}>+${mod.costo.toFixed(2)}</span>
                    )}
                    <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim, textTransform: 'uppercase' }}>
                      {mod.tipo === 'sin' ? '❌ quitar' : mod.tipo === 'extra' ? '➕ extra' : mod.tipo}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                onClick={proceedFromModsForced}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
              >
                Listo →
              </button>
            </div>
          </div>
        )}

        {menuStep === 'mods-optional' && selectedProduct && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              EXTRAS / MODIFICADORES — {selectedProduct.nombre} <span style={{ fontSize: 9, color: colors.textDim, fontWeight: 400 }}>Opcional</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, overflow: 'auto', flex: 1, alignContent: 'start' }}>
              {selectedProduct.mods_opcionales?.map(mod => {
                const isSelected = modsOptional.some(m => m.id === mod.id)
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModOptional(mod)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      padding: 8, borderRadius: 9, cursor: 'pointer', background: isSelected ? (mod.tipo === 'sin' ? colors.redDim : colors.greenDim) : colors.surface2,
                      border: `2px solid ${isSelected ? (mod.tipo === 'sin' ? colors.redB : colors.greenB) : colors.border}`, textAlign: 'center', height: 80,
                      transition: 'all 0.13s',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{mod.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{mod.nombre}</span>
                    {mod.costo > 0 && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: colors.amber }}>+${mod.costo.toFixed(2)}</span>
                    )}
                    <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: colors.textDim, textTransform: 'uppercase' }}>
                      {mod.tipo === 'sin' ? '❌ quitar' : mod.tipo === 'extra' ? '➕ extra' : mod.tipo}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                onClick={proceedFromModsOptional}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
              >
                Listo →
              </button>
            </div>
          </div>
        )}

        {menuStep === 'qty' && selectedProduct && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 3, textTransform: 'uppercase', color: colors.textDim, padding: '8px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              CANTIDAD
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}>{selectedProduct.emoji || '🍽️'}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: colors.text }}>{selectedProduct.nombre}</div>
                {selectedVariant && (
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: colors.textMid, marginTop: 2 }}>{selectedVariant.nombre}</div>
                )}
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: colors.orange, marginTop: 2 }}>
                  ${(getProductPrice(selectedProduct) + getExtraCost()).toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  style={{ width: 52, height: 52, borderRadius: 12, border: `2px solid ${colors.border2}`, background: colors.surface2, color: colors.text, fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                >
                  −
                </button>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 52, fontWeight: 900, color: colors.orange, minWidth: 70, textAlign: 'center', lineHeight: 1 }}>{qty}</div>
                <button
                  onClick={() => setQty(qty + 1)}
                  style={{ width: 52, height: 52, borderRadius: 12, border: `2px solid ${colors.border2}`, background: colors.surface2, color: colors.text, fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                >
                  +
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, width: '100%', maxWidth: 320 }}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ width: '100%', maxWidth: 320 }}>
                <input
                  type="text"
                  placeholder="📝 Nota para cocina (opcional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => setMenuStep(selectedProduct?.mods_opcionales?.length ? 'mods-optional' : 'prods')} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.surface2, color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ← Atrás
              </button>
              <button onClick={confirmItem} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.green, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
                ✅ Agregar (×{qty})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderCobrarModal = () => {
    if (!showCobrar) return null
    const iva = orderTotal * 0.1
    const igtf = selectedPayment === 'divisa' ? orderTotal * 0.03 : 0
    const totalConImpuestos = orderTotal + iva + igtf
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border2}`, borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', animation: 'fadeIn 0.15s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700 }}>💳 Cobrar</div>
            <button
              onClick={() => { setShowCobrar(false); setSelectedTable(null); setCurrentView('mesas') }}
              style={{ width: 26, height: 26, borderRadius: 6, background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 4 }}>Mesa {selectedTable?.numero}</div>
                <div style={{ fontSize: 9, color: colors.textDim }}>{currentOrder.length} items</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: colors.orange }}>${totalConImpuestos.toFixed(2)}</div>
              </div>
            </div>
            
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: 2, textTransform: 'uppercase', color: colors.textDim, marginBottom: 6 }}>Forma de pago</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {FORMAS_PAGO.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
                    border: `2px solid ${selectedPayment === method.id ? colors.orange : colors.border}`,
                    background: selectedPayment === method.id ? colors.orangeDim : colors.surface2,
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: selectedPayment === method.id ? colors.orange : colors.text,
                  }}
                >
                  <span>{method.icon}</span> {method.label}
                </button>
              ))}
            </div>
            <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: colors.textDim, marginBottom: 6 }}>Equivalente en Bs.</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: colors.cyan }}>
                Bs. {(totalConImpuestos * tasaBCV).toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowCobrar(false) }}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={processPayment}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: colors.green, color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ✅ Procesar Pago
            </button>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  const renderAdminView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.surface, flexShrink: 0 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: colors.text }}>⚙️ Administración</div>
        <button onClick={() => setCurrentView('destino')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.textMid, fontSize: 12, cursor: 'pointer' }}>← Volver</button>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ width: 180, background: colors.topbar, borderRight: `1px solid ${colors.border}`, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { id: 'menu', label: '🍽️ Menú', icon: '🍽️' },
            { id: 'reportes', label: '🗒️ Reportes', icon: '🗒️' },
            { id: 'creditos', label: '💰 Créditos CxC', icon: '💰' },
            { id: 'usuarios', label: '👥 Usuarios', icon: '👥' },
            { id: 'config', label: '⚡ Config', icon: '⚡' },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => setAdminView(item.id as typeof adminView)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: adminView === item.id ? colors.surface2 : 'transparent',
                border: adminView === item.id ? `1px solid ${colors.border}` : '1px solid transparent',
                color: adminView === item.id ? colors.orange : colors.textMid,
                fontSize: 12, fontWeight: 600,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
          {adminView === 'menu' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 16 }}>Gestión de Menú</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {DEMO_MENU.map(item => (
                  <div key={item.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24 }}>{item.emoji}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.text, marginTop: 4 }}>{item.nombre}</div>
                    <div style={{ fontSize: 10, color: colors.orange, fontFamily: 'DM Mono, monospace' }}>${item.precio.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {adminView === 'config' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 16 }}>Configuración</div>
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16, maxWidth: 400 }}>
                <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 8 }}>Tasa BCV (Bs/USD)</div>
                <input
                  type="number"
                  value={tasaBCV}
                  onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 16, fontFamily: 'DM Mono, monospace' }}
                />
              </div>
            </div>
          )}
          {adminView === 'reportes' && (
            <div style={{ textAlign: 'center', color: colors.textDim, padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div>Reportes en desarrollo</div>
            </div>
          )}
          {adminView === 'creditos' && (
            <div style={{ textAlign: 'center', color: colors.textDim, padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
              <div>Créditos CxC en desarrollo</div>
            </div>
          )}
          {adminView === 'usuarios' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 16 }}>Usuarios Demo</div>
              {DEMO_USERS.map(user => (
                <div key={user.pin} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{user.nombre[0]}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{user.nombre}</div>
                    <div style={{ fontSize: 10, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>{user.rol} • PIN: {user.pin}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCorteXModal = () => null
  const renderCorteZModal = () => null
  const renderFuncionesMesaModal = () => null
  const renderClienteModal = () => null
  const renderDividirModal = () => null
  const renderNotaConsumoModal = () => null
  const renderFuncionesModal = () => null

  const activeCount = tables.filter(t => t.estado !== 'libre').length
  const totalTables = tables.length

  const displayView = currentUser ? currentView : 'login'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bg, color: colors.text, overflow: 'hidden' }}>
      <div style={{ height: 52, background: colors.topbar, borderBottom: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            🍽️
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 900, color: colors.text }}>POS RESTAURANT</div>
            <div style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim }}>ZYTEK CLOUD ERP</div>
          </div>
        </div>
        
        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '3px 8px', borderRadius: 20, border: '1px solid', background: colors.greenDim, borderColor: colors.greenB, color: colors.green }}>
          ● {activeCount}/{totalTables} mesas
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
            <div style={{ fontSize: 7, fontFamily: 'DM Mono, monospace', letterSpacing: 2, color: colors.textDim }}>TASA BCV</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700, color: colors.cyan }}>—</div>
          </div>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.amber, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: colors.surface2, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', background: currentUser?.color || colors.orange }}>
              {currentUser?.nombre[0] || '?'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{currentUser?.nombre || 'Invitado'}</div>
              <div style={{ fontSize: 9, color: colors.textDim, fontFamily: 'DM Mono, monospace' }}>{currentUser?.rol || 'Sin rol'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 36, background: colors.topbar, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'flex-end', padding: '0 8px', gap: 2, flexShrink: 0 }}>
        <div
          onClick={() => setCurrentView('mesas')}
          style={{
            padding: '6px 14px', borderRadius: '5px 5px 0 0', fontSize: 11, fontFamily: 'DM Mono, monospace',
            cursor: 'pointer', color: currentView === 'mesas' ? colors.orange : colors.textDim,
            border: '1px solid transparent', borderBottom: 'none',
            background: currentView === 'mesas' ? colors.surface2 : 'transparent',
            borderColor: currentView === 'mesas' ? colors.border : 'transparent',
            whiteSpace: 'nowrap', letterSpacing: 0.3, transition: 'all 0.15s',
          }}
        >
          🗺️ MESAS
        </div>
        <div
          onClick={() => selectedTable && setCurrentView('comanda')}
          style={{
            padding: '6px 14px', borderRadius: '5px 5px 0 0', fontSize: 11, fontFamily: 'DM Mono, monospace',
            cursor: selectedTable ? 'pointer' : 'not-allowed',
            color: currentView === 'comanda' ? colors.orange : colors.textDim,
            border: '1px solid transparent', borderBottom: 'none',
            background: currentView === 'comanda' ? colors.surface2 : 'transparent',
            borderColor: currentView === 'comanda' ? colors.border : 'transparent',
            whiteSpace: 'nowrap', letterSpacing: 0.3, transition: 'all 0.15s', opacity: selectedTable ? 1 : 0.5,
          }}
        >
          📋 COMANDA
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {displayView === 'login' && renderLoginView()}
        {displayView === 'destino' && renderDestinoView()}
        {displayView === 'mesas' && renderMesasView()}
        {displayView === 'comanda' && renderComandaView()}
        {displayView === 'admin' && renderAdminView()}
      </div>

      {renderCobrarModal()}
      {renderCorteXModal()}
      {renderCorteZModal()}
      {renderFuncionesMesaModal()}
      {renderClienteModal()}
      {renderDividirModal()}
      {renderNotaConsumoModal()}
      {renderFuncionesModal()}
      {renderAuthOverlay()}

      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.25); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  )
}