# TODO v2 · Normalizaciones diferidas

Lista de cosas que el Bloque A decidió NO normalizar ahora (para no bloquear
el cobro) y que conviene abordar en una migración futura dedicada. Cada item
incluye dónde vive el código actual y qué hay que renombrar.

---

## 1. `pos_orders` — nombres en inglés vs convención del proyecto

El resto del schema (y los briefings) usan español, pero `pos_orders` tiene
columnas y valores en inglés:

| Actual (inglés) | Deseado (español) |
|---|---|
| `status` con valores `'pending'`, `'draft'` | `estado` con `'abierta'`, `'cerrada'`, `'cobrada'`, `'anulada'` |
| `waiter_id` | `cajero_id` (o `mesero_id` si el rol es así) |

### Lugares del código que hacen referencia a los nombres actuales

- `src/components/pos/POSRestaurant.tsx:479` — `.select('*, zytek_users!waiter_id(nombre), pos_order_items(*)').in('status', ['pending', 'draft'])`
- `src/components/pos/POSRestaurant.tsx:711` — `status: 'draft'` al crear comanda
- `src/components/pos/POSRestaurant.tsx:1161` — `status: 'cancelled'` al anular
- `src/components/pos/POSRestaurant.tsx:1534` — `status: 'pending'` al enviar a cocina
- `src/components/pos/POSRestaurant.tsx:2617/2621` — upserts de sync offline
- `src/components/kds/KDS.tsx:147/275/341/366` — KDS lee/escribe `status`
- `src/app/api/sync/route.ts:108` — whitelist de columnas incluye `cajero_id` (en otra tabla, revisar si colisiona)

### Trabajo para la migración futura

1. `ALTER TABLE pos_orders RENAME COLUMN status TO estado`
2. `ALTER TABLE pos_orders RENAME COLUMN waiter_id TO cajero_id` (validar primero si `cajero_id` ya existe en otra tabla relacionada)
3. Ampliar/reemplazar el CHECK de `estado` con los valores `'abierta', 'cerrada', 'cobrada', 'anulada'` (y un paso de `UPDATE` para mapear los legacy a nuevos).
4. Sustituir todas las referencias listadas arriba en un solo commit atómico.
5. Revisar también `pos_order_items.enviado_cocina` y otros boolean flags por consistencia de idioma (no urgente).

---

## 2. `pos_audit_trace` — columnas documentadas vs reales

El documento maestro describe `pos_audit_trace` con columnas que NO existen.
La DB real usa otras.

| Documentado | Real |
|---|---|
| `severity` | ❌ no existe |
| `target_type` | `entity_type` |
| `target_id` | `entity_id` |
| `mesa_id` | ❌ no existe |
| `order_id` | ❌ no existe |
| `pin_attempt_ok` | ❌ no existe |
| `target_role` | ❌ no existe |
| `min_level_required` | ❌ no existe |
| `metadata` | `data_after` (jsonb) |
| `user_agent` | `device_id` |
| — | + `authorized_by`, `data_before`, `is_anomaly` |

### Decisión en Bloque A

La migración `026_fintrack_base.sql` ajusta el INSERT dentro de
`fintrack_aplicar_movimiento` para usar las columnas reales. El schema NO se
modifica.

### Trabajo para la migración futura

Alinear el schema maestro del proyecto con la realidad (documentación) o
ampliar `pos_audit_trace` con las columnas faltantes si se consideran
necesarias para el audit trail (ej: `severity`, `mesa_id`, `order_id` son
útiles para filtros rápidos en dashboards).

---

## 3. PaymentService (A.2) · dependencia pendiente

Cuando se ejecute A.2, el servicio de cobro va a necesitar leer/actualizar
`pos_orders`. Antes de escribir la query de `UPDATE`, hacer un
`SELECT column_name FROM information_schema.columns WHERE table_name =
'pos_orders'` y adaptar los nombres a los reales (ver item 1).

Específicamente el A.2 asume `estado`, `cajero_id`, `paid_at`, `propina`,
`descuento`, `notes`, `numero_comanda`, `mesa_id`. Hay que verificar cada
uno antes de usarlos.

---

## 4. Deuda técnica de tipos · alineación camelCase / snake_case

`npx tsc --noEmit` reporta 33 errores preexistentes (detectados al arrancar
A.2.2, 2026-04-19). Ninguno bloquea el cobro, pero hay que limpiarlos antes
de cerrar el Bloque B.

### Archivos afectados

- `src/components/admin/AdminPanel.tsx` — 5 errores
- `src/components/pos/POSRestaurant.tsx` — 28 errores

### Patrones de error

1. **camelCase vs snake_case en props de tipos DB**
   - `SubGrupo.categoriaId` → `categoria_id`
   - `Modificador.grupoId` → `grupo_id`
   - `MenuCategory.hasSubgroups` → `has_subgroups`
   - `MenuItem.forcedModifiers` → `forced_modifiers`
   - `MetodoPago.active` → `activo`

2. **Propiedades faltantes en tipos DB**
   - `ModGrupo.min` / `ModGrupo.max` — no existen en el tipo
   - `MenuItem.categoria_id` — no existe en el tipo
   - `MenuCategory.image_url` / `MenuItem.image_url` — no existen
   - `MetodoPago.identificador` / `.moneda` / `.emoji` — no existen
   - `Table.mesero` — no existe
   - `Table.grid_x` / `grid_y` / `grid_page` — faltantes en literal

3. **Imports/tipos huérfanos tras el refactor**
   - `POSRestaurant.tsx:3` — `Subscription` ya no exportado desde `@/types`
   - `POSRestaurant.tsx:201` — `POSSettings` no encontrado
   - `POSRestaurant.tsx:202` — `POSSession` no encontrado
   - `POSRestaurant.tsx:698` — `id_db` no válido en `Table`
   - `POSRestaurant.tsx:866` — asignar `null` a state `string`
   - `POSRestaurant.tsx:1032` — prop CSS `zTarget` inválida

### Origen probable

Refactor del commit `3c88e1c refactor(types): alinear Usuario y Permiso con
schema real`. Los tipos se alinearon al schema real pero los consumidores de
AdminPanel y POSRestaurant quedaron con nombres viejos.

### Trabajo para la migración futura

1. Actualizar los consumidores a los nombres de propiedad reales (snake_case
   en la mayoría de los casos, según schema DB).
2. Definir o re-exportar los tipos faltantes (`Subscription`, `POSSettings`,
   `POSSession`) o refactorizar sus usos.
3. Verificar si `Table.mesero`, `MetodoPago.emoji` etc. deben agregarse al
   tipo o eliminarse del UI.
4. Tras el fix, `npx tsc --noEmit` debe pasar limpio antes de cerrar B.

---

## 5. A.2.8 · Constraint único sobre comandas abiertas por mesa (POSPUESTO)

Originalmente parte de A.2.6. Se sacó porque sin conocer el schema real
de `pos_orders` y el modelo de mesas divididas, cualquier `UNIQUE` puede
romper features existentes.

### Objetivo

Una migración que evite que una misma mesa tenga dos comandas abiertas
simultáneamente (se disparaban race conditions al enviar/cobrar rápido
y con sync offline de por medio).

### Investigación previa — obligatoria antes de escribir la migración

1. **Dump del schema real de `pos_orders`.** La tabla NO está creada en
   `supabase/migrations/`. Grep de `create table pos_orders` en el repo:
   0 matches. Existe en Supabase pero fuera del control de migraciones.
   Exportar el DDL actual (columnas, tipos, constraints, indices) y, si
   procede, commit de una migración `create table if not exists` que
   documente el estado para que futuras migraciones se apoyen en él.

2. **Modelo de mesas divididas (⎇ N).** Grep de
   `dividir`/`split`/`parent_order`/`mesa_dividida` en `src/`: 0 matches.
   El badge de la fase 1.5 (`feat(pos): fase 1.5 — badge de mesa dividida`)
   existe pero el backend no aparece. Necesitamos:
   - Decidir si dividir genera múltiples `pos_orders` activas para la
     misma `mesa` o una sola orden con items divididos.
   - Si son múltiples, el UNIQUE rompe la feature → usar otro predicate
     (ej. índice funcional sobre una columna `principal`).

3. **Nombre real de la columna.** El código usa `mesa` (text con el
   nombre/número de mesa, no uuid): ver `POSRestaurant.tsx:717,1543,1703`
   y `payment/service.ts:51`. El plan original decía `mesa_id uuid` —
   no existe en el código actual.

4. **Estados a cubrir por el partial index.** El ciclo real es
   `draft → pending → paid/cancelled`. Un constraint sólo sobre `pending`
   permite coexistencia de una `draft` + una `pending` para la misma mesa
   (justo lo que queremos evitar). El predicate correcto es
   `WHERE status IN ('draft','pending')`.

### Esqueleto tentativo (ajustar tras investigación)

```sql
-- supabase/migrations/0NN_pos_orders_unique_por_mesa.sql
create unique index if not exists idx_pos_orders_unique_abierta
  on pos_orders (tenant_id, mesa)
  where status in ('draft', 'pending');
```

### Criterios para cerrar A.2.8

- Schema DDL de `pos_orders` documentado en una migración.
- Modelo de mesas divididas confirmado (o implementado) con tests.
- Migración aplicada en staging + smoke test de:
  (a) abrir mesa A, abrir mesa A otra vez desde otra sesión → debe fallar.
  (b) dividir mesa → no debe violar la constraint.
  (c) cobrar comanda → libera la mesa (status='paid') y permite abrir nueva.

### Mientras tanto

La protección defensiva en código (A.2.6) es suficiente en producción:
write-through IDB + retry + mensajes específicos + fallback. El constraint
a nivel DB se añade sólo cuando el modelo esté claro.

---

## 6. A.2.7 · Sync route no drena tablas de cobro (BLOQUEANTE para prod)

Descubierto durante A.2.6. El fail-safe offline encola correctamente en
IndexedDB pero los datos nunca llegan al backend por 3 bugs en
`src/app/api/sync/route.ts`:

1. **`ALLOWED_TABLES` incompleto** —
   `['ventas','inventario','clientes','menu_items','turnos']` no incluye
   `pos_orders`, `pos_order_items`, `pos_audit_trace`.
   _Impacto:_ todos los cobros offline quedan atrapados en el dispositivo.

2. **Mismatch de nombres de campo** entre lo que escribe `enqueueSync` y
   lo que espera `syncQueueSchema`:
   - `enqueueSync` escribe: `{tabla, op, ts}`
   - `syncQueueSchema` espera: `{table, operation, timestamp}`

3. **Mismatch de body**:
   - Cliente envía: `{ operations: [...] }`
   - Route lee: `req.body.items`

### Alcance A.2.7

- Añadir `pos_orders`, `pos_order_items`, `pos_audit_trace` a
  `ALLOWED_TABLES`.
- Unificar nomenclatura (decidir cuál es la fuente de verdad).
- Test E2E: offline → cobrar → online → verificar filas en Supabase.
- Smoke test de todas las otras tablas offline (`ventas`, `menu_items`)
  por si el mismo mismatch las afectaba silenciosamente.

### Criticidad

**BLOQUEANTE para deploy a primer cliente.** El flujo offline es requisito
del modelo Restaurant Lite (kiosko tablet + IndexedDB).
