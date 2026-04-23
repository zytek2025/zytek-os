import { z } from 'zod'

export const uuidSchema = z.string().uuid({ message: 'ID inválido' })

export const pinSchema = z.string()
  .min(4, 'PIN debe tener al menos 4 dígitos')
  .max(10, 'PIN debe tener máximo 10 dígitos')
  .regex(/^\d+$/, 'PIN debe contener solo números')

export const loginSchema = z.object({
  pin: pinSchema,
  tenantId: uuidSchema,
})

export const licenseKeySchema = z.string()
  .min(10, 'Clave de licencia muy corta')
  .max(100, 'Clave de licencia muy larga')
  .regex(/^ZYTEK-/, 'Formato de licencia inválido')

export const licenseValidationSchema = z.object({
  key: licenseKeySchema,
  moduleId: z.enum(['pos', 'admin', 'mesero', 'kds', 'retail', 'crm', 'fintrack', 'constructor']).optional(),
})

export const menuItemSchema = z.object({
  id: uuidSchema.optional(),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  cat: z.string().max(50).optional(),
  precio: z.number().min(0, 'Precio no puede ser negativo'),
  precioMatriz: z.record(z.number()).optional(),
  modificadores: z.array(uuidSchema).optional(),
  receta: z.array(z.object({
    invId: uuidSchema,
    cantidad: z.number().min(0),
  })).optional(),
  activo: z.boolean().default(true),
  emoji: z.string().max(10).optional(),
  descripcion: z.string().max(500).optional(),
  kdsStation: z.string().max(50).optional(),
})

export const inventarioItemSchema = z.object({
  id: uuidSchema.optional(),
  nom: z.string().min(1, 'Nombre requerido').max(100),
  cat: z.string().max(50).optional(),
  uni: z.string().max(20).default('und'),
  stock: z.number().min(0).default(0),
  min: z.number().min(0).default(0),
  costo: z.number().min(0).default(0),
  ubicacionId: z.string().max(50).optional(),
})

export const ventaItemSchema = z.object({
  itemId: uuidSchema,
  nombre: z.string(),
  cantidad: z.number().int().min(1),
  precio: z.number().min(0),
  observaciones: z.string().max(200).optional(),
})

export const ventaSchema = z.object({
  id: uuidSchema,
  turnoId: uuidSchema.optional().nullable(),
  mesa: z.string().max(50).optional(),
  clienteId: uuidSchema.optional().nullable(),
  items: z.array(ventaItemSchema).min(1, 'Al menos un item requerido'),
  total: z.number().min(0),
  totalBs: z.number().min(0).optional(),
  formasPago: z.array(z.object({
    forma: z.string(),
    monto: z.number().min(0),
  })).optional(),
  iva: z.number().min(0).default(0),
  igtf: z.number().min(0).default(0),
  cajero: z.string().max(100).optional(),
  tipo: z.enum(['venta', 'devolucion']).default('venta'),
  ts: z.number().int().optional(),
})

export const clienteSchema = z.object({
  id: uuidSchema.optional(),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  tel: z.string().max(30).optional(),
  email: z.string().email('Email inválido').max(100).optional().or(z.literal('')),
  visitas: z.number().int().min(0).default(0),
  gasto: z.number().min(0).default(0),
  cxc: z.number().min(0).default(0),
  adelanto: z.number().min(0).default(0),
  puntos: z.number().int().min(0).default(0),
  nivel: z.enum(['Bronce', 'Plata', 'Oro', 'VIP']).default('Bronce'),
  tipo: z.enum(['regular', 'frecuente', 'vip']).default('regular'),
  estado: z.enum(['activo', 'inactivo', 'bloqueado']).default('activo'),
})

export const turnoSchema = z.object({
  cajeroId: uuidSchema.optional(),
  cajero: z.string().max(100).optional(),
  apertura: z.string().datetime().optional(),
  cierre: z.string().datetime().optional(),
  estado: z.enum(['activo', 'cerrado_x', 'cerrado_z']).default('activo'),
  fondo: z.number().min(0).default(0),
})

export const corteZSchema = z.object({
  turnoId: z.string().max(100),
  cajero: z.string().max(100).optional(),
  apertura: z.string().datetime().optional(),
  cierre: z.string().datetime().optional(),
  totalVentas: z.number().min(0),
  totalBs: z.number().min(0).optional(),
  totalTickets: z.number().int().min(0),
  formasPago: z.array(z.object({
    forma: z.string(),
    monto: z.number().min(0),
  })).optional(),
  iva: z.number().min(0).default(0),
  igtf: z.number().min(0).default(0),
  tasa: z.number().min(0).optional(),
  checksum: z.string().max(100).optional(),
})

// Schema alineado con el productor real (src/lib/idb.client.ts enqueueSync).
// Cliente escribe: {id, modulo, tabla, op, data, turnoId, ts, intentos}.
// El servidor (src/app/api/sync/route.ts) respeta el id del cliente para
// que useSyncQueue.flush pueda borrar el registro local tras confirmacion.
export const syncItemSchema = z.object({
  id: z.string().min(1).max(100),
  modulo: z.string().min(1).max(50),
  tabla: z.enum([
    'ventas', 'inventario', 'clientes', 'menu_items', 'turnos',
    'pos_orders', 'pos_order_items', 'pos_payments', 'pos_audit_trace',
  ]),
  op: z.enum(['upsert', 'delete']),
  data: z.record(z.any()),
  turnoId: z.string().max(50).optional(),
  ts: z.number().int().optional(),
  intentos: z.number().int().optional(),
})

export const syncQueueSchema = z.object({
  operations: z.array(syncItemSchema).min(1).max(100),
})

export const reportesQuerySchema = z.object({
  tipo: z.enum(['ventas', 'inventario', 'clientes', 'cxc', 'cortes']),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  formato: z.enum(['json', 'pdf', 'csv']).default('json'),
})

export const idSchema = z.object({
  id: uuidSchema,
})
