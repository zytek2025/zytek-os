# BLOQUE A · Cobro end-to-end con FinTrack base

**Proyecto:** ZytekOS · Zytek LLC · zytek.app
**Fecha:** 19 abril 2026
**Autor:** Daniel Fornerino + Claude Opus 4.7
**Objetivo:** Construir el flujo completo de cobro del POS conectado a una capa de tesorería (FinTrack) que registra cada movimiento de dinero con trazabilidad total.

---

## 📋 Cómo usar este documento

Este es el prompt maestro para Claude Code. Se compone de 3 sub-bloques que se ejecutan en secuencia:

1. **A.1 · FinTrack base** — schema de cuentas, formas de pago, movimientos, monedas
2. **A.2 · Flujo de cobro** — modal de cobro, pago dividido, cierre de comanda
3. **A.3 · Fix de Enviar a Mesas** — después de enviar comanda regresa al listado

**Orden estricto · Claude Code debe:**

- Ejecutar A.1 completo y hacer commit
- Solo después avanzar a A.2
- Solo después de A.2 avanzar a A.3
- Si algo falla en A.1, detenerse y reportar. NO avanzar a A.2 con A.1 roto.

**Regla de disciplina:** cada sub-bloque se cierra o no avanzamos. Esto es INNEGOCIABLE.

---

## 🎯 Contexto del sistema

### Stack

- Next.js 15.3 con App Router
- Supabase cloud (proyecto cpjrcupakyinwjaunqwd, Legacy HS256 keys)
- PostgreSQL 15 con RLS habilitado
- Tailwind CSS + DM Sans / DM Mono / Fraunces
- Design dark theme · background `#0a0a0f` · accent `#7F77DD` (o `#ff7c20` orange en POS)

### Ruta local del repo

```
C:\zytekos\zytek-os
```

### Tenant demo activo

```
id: 00000000-0000-0000-0000-0000000000de
nombre: Zytek Demo Lounge
zonas: 3 (Salón Principal, Terraza, Barra)
mesas: 16
```

### Usuarios demo

- Admin Demo · PIN 1234 · nivel 1
- Mesero Demo · PIN 5678 · nivel 5

### Tablas existentes (NO modificar sin razón)

```
tenants, zytek_users, pos_zonas, mesas,
categorias, subgrupos, items, mod_grupos, mod_items, item_mod_grupos,
pos_orders, pos_order_counters, pos_order_items, pos_order_subcuentas,
pos_notas_consumo, pos_nota_envios,
pos_audit_trace, pos_user_audit,
pos_permissions, admin_sessions
```

### Schema existente relevante · pos_orders

Campos clave que ya existen y vamos a usar:

```sql
estado text check (estado in ('abierta','cerrada','cobrada','anulada'))
metodo_pago text                -- legacy · vamos a deprecar
paid_at timestamptz
subtotal, descuento, propina, iva, total numeric(12,2)
```

### Functions existentes relevantes

```
user_can(user_id, permission) -> boolean
user_permissions(user_id) -> tabla
next_numero_comanda(tenant_id) -> text
create_admin_session, refresh_admin_session, revoke_admin_session
```

---

## 🏗️ Principios de diseño · SOLID + QA

Todo el código generado debe cumplir:

### Single Responsibility

- Un servicio = una responsabilidad clara
- `FinTrackService` gestiona cuentas y movimientos · NO sabe de mesas
- `PaymentService` gestiona el flujo de cobro · NO sabe de productos
- `OrderService` gestiona comandas · NO sabe de cuentas bancarias
- La comunicación entre servicios es explícita vía interfaces

### Open/Closed

- Agregar nuevas formas de pago = insertar fila en `fintrack_formas_pago`
- Agregar nuevas monedas = insertar fila en `fintrack_monedas`
- NO requiere cambiar código existente
- El selector de métodos en UI se renderiza dinámicamente desde la DB

### Liskov Substitution

- Cualquier cuenta (efectivo, bancaria, digital, etc) responde al mismo contrato
- `aplicar_movimiento(cuenta_id, monto, tipo)` funciona igual sin importar el tipo de cuenta

### Interface Segregation

- Los componentes UI reciben props mínimas
- El modal de cobro NO recibe el objeto tenant completo, solo `monedaPrincipal` y `tasaActual`

### Dependency Inversion

- Los componentes consumen hooks (`useFinTrack`, `usePayment`) que abstraen Supabase
- Cambiar el backend no requiere tocar componentes

### QA · tests obligatorios

Al final de cada sub-bloque, generar archivo de tests manual `.md` con:

- Pasos numerados a probar
- Resultados esperados
- Casos borde a validar

El usuario (Daniel) ejecuta manualmente estos tests antes de aprobar commit.

---

## 🔒 Reglas operativas estrictas

1. NUNCA pasar `SERVICE_ROLE_KEY` en línea de comando. Scripts cargan `.env.local` con `dotenv`.
2. Migraciones SQL se aplican vía Supabase Studio (SQL Editor) · NO vía REST API.
3. Antes de DROP, TRUNCATE, o cualquier comando destructivo · pausar y reportar.
4. Commits separados por sub-bloque · mensajes descriptivos · co-author Claude.
5. Si un archivo existente necesita modificarse, LEER primero con `view`, después `str_replace` con contexto suficiente.
6. NO crear archivos sueltos sin plan · seguir la lista de entregables de cada sub-bloque.
7. Si Claude Code encuentra algo inesperado (ej: el schema real difiere de lo descrito aquí), PAUSAR y reportar · NO improvisar soluciones.
8. El texto de la UI siempre en español.
9. Código limpio, comentado en español donde aporte contexto · sin comentarios obvios.
10. Si la memoria de contexto de Claude Code se está acabando, comentar "CHECKPOINT" y listar lo ya hecho antes de continuar.

---

---

# SUB-BLOQUE A.1 · FinTrack base

**Duración estimada:** 3 horas de trabajo de Claude Code
**Objetivo:** Schema + funciones SQL + CRUD básico de cuentas + seed para el tenant demo

## A.1.1 · Migración SQL

**Archivo a crear:** `supabase/migrations/026_fintrack_base.sql`

### Schema completo

```sql
-- ═══════════════════════════════════════════════════════════════
-- 1. Catálogo de monedas soportadas
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_monedas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  simbolo text not null,
  decimales int not null default 2,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Seed de monedas globales
insert into fintrack_monedas (codigo, nombre, simbolo, decimales) values
  ('USD', 'Dólar estadounidense', '$', 2),
  ('VES', 'Bolívar soberano', 'Bs', 2),
  ('MXN', 'Peso mexicano', '$', 2),
  ('COP', 'Peso colombiano', '$', 0),
  ('PEN', 'Sol peruano', 'S/', 2),
  ('ARS', 'Peso argentino', '$', 2),
  ('EUR', 'Euro', '€', 2)
on conflict (codigo) do nothing;


-- ═══════════════════════════════════════════════════════════════
-- 2. Configuración de moneda por tenant
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_tenant_monedas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  moneda_codigo text not null references fintrack_monedas(codigo),
  es_principal boolean default false,
  activa boolean default true,
  orden int default 0,
  created_at timestamptz default now(),
  unique(tenant_id, moneda_codigo)
);

create index if not exists idx_tenant_monedas_tenant
  on fintrack_tenant_monedas(tenant_id);


-- ═══════════════════════════════════════════════════════════════
-- 3. Tasas de cambio diarias por tenant
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_tasas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  moneda_origen text not null references fintrack_monedas(codigo),
  moneda_destino text not null references fintrack_monedas(codigo),
  tasa numeric(18,6) not null check (tasa > 0),
  fecha date not null default current_date,
  fuente text default 'manual',
  creado_por uuid references zytek_users(id),
  created_at timestamptz default now(),
  unique(tenant_id, moneda_origen, moneda_destino, fecha)
);

create index if not exists idx_tasas_tenant_fecha
  on fintrack_tasas(tenant_id, fecha desc);


-- ═══════════════════════════════════════════════════════════════
-- 4. Catálogo de formas de pago (categorías genéricas)
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_formas_pago_catalogo (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null,
  descripcion text,
  icono text,
  requiere_referencia boolean default false,
  requiere_cuenta boolean default true,
  orden int default 0,
  activo boolean default true
);

-- Seed de formas de pago universales
insert into fintrack_formas_pago_catalogo (slug, nombre, descripcion, icono, requiere_referencia, requiere_cuenta, orden) values
  ('efectivo', 'Efectivo', 'Pago en efectivo físico', 'cash', false, true, 10),
  ('tarjeta_pos', 'Punto de venta', 'Pago con tarjeta por POS físico', 'credit-card', true, true, 20),
  ('transferencia', 'Transferencia', 'Transferencia bancaria', 'building-bank', true, true, 30),
  ('pago_movil', 'Pago móvil', 'Pago móvil interbancario', 'smartphone', true, true, 40),
  ('biopago', 'BioPago', 'Pago biométrico Banco de Venezuela', 'fingerprint', false, true, 50),
  ('zelle', 'Zelle', 'Transferencia Zelle USA', 'send', true, true, 60),
  ('paypal', 'PayPal', 'Pago por PayPal', 'paypal', true, true, 70),
  ('cripto', 'Criptomoneda', 'Pago en cripto (USDT, BTC)', 'bitcoin', true, true, 80),
  ('credito_cliente', 'Crédito al cliente', 'Cuenta por cobrar', 'user-check', false, false, 90)
on conflict (slug) do nothing;


-- ═══════════════════════════════════════════════════════════════
-- 5. Formas de pago habilitadas por tenant
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_formas_pago_tenant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  forma_pago_slug text not null references fintrack_formas_pago_catalogo(slug),
  nombre_personalizado text,
  activa boolean default true,
  orden int default 0,
  created_at timestamptz default now(),
  unique(tenant_id, forma_pago_slug)
);

create index if not exists idx_formas_pago_tenant
  on fintrack_formas_pago_tenant(tenant_id, activa);


-- ═══════════════════════════════════════════════════════════════
-- 6. Cuentas (el corazón de FinTrack)
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_cuentas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'bancaria', 'digital', 'credito_cliente', 'otro')),
  moneda_codigo text not null references fintrack_monedas(codigo),
  numero_cuenta text,
  titular text,
  banco text,
  saldo_inicial numeric(18,2) default 0,
  saldo_actual numeric(18,2) default 0,
  notas text,
  activa boolean default true,
  orden int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cuentas_tenant on fintrack_cuentas(tenant_id, activa);
create index if not exists idx_cuentas_moneda on fintrack_cuentas(tenant_id, moneda_codigo);


-- ═══════════════════════════════════════════════════════════════
-- 7. Pivot N:M entre cuentas y formas de pago
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_cuenta_formas_pago (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  cuenta_id uuid not null references fintrack_cuentas(id) on delete cascade,
  forma_pago_slug text not null references fintrack_formas_pago_catalogo(slug),
  es_default boolean default false,
  created_at timestamptz default now(),
  unique(cuenta_id, forma_pago_slug)
);

create index if not exists idx_cuenta_fp_tenant
  on fintrack_cuenta_formas_pago(tenant_id);
create index if not exists idx_cuenta_fp_forma
  on fintrack_cuenta_formas_pago(tenant_id, forma_pago_slug);


-- ═══════════════════════════════════════════════════════════════
-- 8. Libro de movimientos (inmutable · append-only)
-- ═══════════════════════════════════════════════════════════════

create table if not exists fintrack_movimientos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  cuenta_id uuid not null references fintrack_cuentas(id),
  tipo text not null check (tipo in (
    'ingreso_venta',
    'deposito',
    'retiro',
    'transferencia_salida',
    'transferencia_entrada',
    'ajuste_positivo',
    'ajuste_negativo',
    'apertura'
  )),
  monto numeric(18,2) not null check (monto > 0),
  moneda_codigo text not null references fintrack_monedas(codigo),
  tasa_usada numeric(18,6),
  monto_moneda_principal numeric(18,2),
  cuenta_contraparte_id uuid references fintrack_cuentas(id),
  referencia_tipo text,
  referencia_id uuid,
  forma_pago_slug text references fintrack_formas_pago_catalogo(slug),
  descripcion text,
  usuario_id uuid references zytek_users(id),
  metadata jsonb default '{}'::jsonb,
  saldo_antes numeric(18,2),
  saldo_despues numeric(18,2),
  created_at timestamptz default now()
);

create index if not exists idx_mov_tenant_fecha
  on fintrack_movimientos(tenant_id, created_at desc);
create index if not exists idx_mov_cuenta
  on fintrack_movimientos(cuenta_id, created_at desc);
create index if not exists idx_mov_referencia
  on fintrack_movimientos(referencia_tipo, referencia_id)
  where referencia_id is not null;
create index if not exists idx_mov_tipo
  on fintrack_movimientos(tenant_id, tipo, created_at desc);

-- Libro inmutable · solo INSERT desde la app
revoke update, delete on fintrack_movimientos from authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 9. Función CORE · aplicar movimiento
-- ═══════════════════════════════════════════════════════════════

create or replace function fintrack_aplicar_movimiento(
  p_tenant_id uuid,
  p_cuenta_id uuid,
  p_tipo text,
  p_monto numeric,
  p_moneda_codigo text,
  p_usuario_id uuid,
  p_referencia_tipo text default null,
  p_referencia_id uuid default null,
  p_forma_pago_slug text default null,
  p_cuenta_contraparte_id uuid default null,
  p_descripcion text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
as $$
declare
  v_cuenta fintrack_cuentas%rowtype;
  v_saldo_antes numeric(18,2);
  v_saldo_despues numeric(18,2);
  v_direccion int;
  v_moneda_principal text;
  v_tasa numeric(18,6);
  v_monto_principal numeric(18,2);
  v_movimiento_id uuid;
begin
  -- Validar cuenta existe y pertenece al tenant
  select * into v_cuenta
  from fintrack_cuentas
  where id = p_cuenta_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Cuenta % no encontrada o no pertenece al tenant', p_cuenta_id;
  end if;

  if not v_cuenta.activa then
    raise exception 'Cuenta % está inactiva', p_cuenta_id;
  end if;

  -- Validar moneda de la cuenta coincide con moneda del movimiento
  if v_cuenta.moneda_codigo != p_moneda_codigo then
    raise exception 'Moneda % no coincide con moneda de la cuenta %', p_moneda_codigo, v_cuenta.moneda_codigo;
  end if;

  -- Determinar dirección (suma o resta)
  v_direccion := case p_tipo
    when 'ingreso_venta' then 1
    when 'deposito' then 1
    when 'transferencia_entrada' then 1
    when 'ajuste_positivo' then 1
    when 'apertura' then 1
    when 'retiro' then -1
    when 'transferencia_salida' then -1
    when 'ajuste_negativo' then -1
    else 0
  end;

  if v_direccion = 0 then
    raise exception 'Tipo de movimiento inválido: %', p_tipo;
  end if;

  -- Calcular saldos
  v_saldo_antes := v_cuenta.saldo_actual;
  v_saldo_despues := v_saldo_antes + (v_direccion * p_monto);

  -- Obtener moneda principal del tenant
  select moneda_codigo into v_moneda_principal
  from fintrack_tenant_monedas
  where tenant_id = p_tenant_id and es_principal = true
  limit 1;

  -- Si la moneda del movimiento ≠ moneda principal, calcular equivalente
  if v_moneda_principal is not null and v_moneda_principal != p_moneda_codigo then
    select tasa into v_tasa
    from fintrack_tasas
    where tenant_id = p_tenant_id
      and moneda_origen = p_moneda_codigo
      and moneda_destino = v_moneda_principal
      and fecha <= current_date
    order by fecha desc
    limit 1;

    if v_tasa is not null then
      v_monto_principal := round(p_monto * v_tasa, 2);
    else
      v_monto_principal := null;
    end if;
  else
    v_tasa := 1;
    v_monto_principal := p_monto;
  end if;

  -- Insertar movimiento
  insert into fintrack_movimientos (
    tenant_id, cuenta_id, tipo, monto, moneda_codigo,
    tasa_usada, monto_moneda_principal,
    cuenta_contraparte_id, referencia_tipo, referencia_id,
    forma_pago_slug, descripcion, usuario_id, metadata,
    saldo_antes, saldo_despues
  ) values (
    p_tenant_id, p_cuenta_id, p_tipo, p_monto, p_moneda_codigo,
    v_tasa, v_monto_principal,
    p_cuenta_contraparte_id, p_referencia_tipo, p_referencia_id,
    p_forma_pago_slug, p_descripcion, p_usuario_id, p_metadata,
    v_saldo_antes, v_saldo_despues
  ) returning id into v_movimiento_id;

  -- Actualizar saldo de la cuenta
  update fintrack_cuentas
  set saldo_actual = v_saldo_despues,
      updated_at = now()
  where id = p_cuenta_id;

  -- Audit
  insert into pos_audit_trace (
    tenant_id, user_id, action, severity, target_type, target_id, metadata
  ) values (
    p_tenant_id, p_usuario_id, 'fintrack_movimiento', 'info',
    'fintrack_movimiento', v_movimiento_id,
    jsonb_build_object(
      'tipo', p_tipo,
      'monto', p_monto,
      'moneda', p_moneda_codigo,
      'cuenta_id', p_cuenta_id,
      'saldo_antes', v_saldo_antes,
      'saldo_despues', v_saldo_despues
    )
  );

  return v_movimiento_id;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 10. Función · obtener cuentas disponibles para una forma de pago
-- ═══════════════════════════════════════════════════════════════

create or replace function fintrack_cuentas_por_forma_pago(
  p_tenant_id uuid,
  p_forma_pago_slug text
) returns table (
  cuenta_id uuid,
  cuenta_nombre text,
  cuenta_tipo text,
  cuenta_moneda text,
  cuenta_saldo numeric(18,2),
  es_default boolean
)
language plpgsql stable
as $$
begin
  return query
  select
    c.id,
    c.nombre,
    c.tipo,
    c.moneda_codigo,
    c.saldo_actual,
    cfp.es_default
  from fintrack_cuentas c
  join fintrack_cuenta_formas_pago cfp on cfp.cuenta_id = c.id
  where c.tenant_id = p_tenant_id
    and cfp.forma_pago_slug = p_forma_pago_slug
    and c.activa = true
  order by cfp.es_default desc, c.orden, c.nombre;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 11. Función · recalcular saldo desde movimientos (auditoría)
-- ═══════════════════════════════════════════════════════════════

create or replace function fintrack_recalcular_saldo(p_cuenta_id uuid)
returns numeric(18,2)
language plpgsql
as $$
declare
  v_cuenta fintrack_cuentas%rowtype;
  v_saldo_calculado numeric(18,2);
begin
  select * into v_cuenta from fintrack_cuentas where id = p_cuenta_id;

  if not found then
    raise exception 'Cuenta % no encontrada', p_cuenta_id;
  end if;

  select coalesce(v_cuenta.saldo_inicial, 0) + coalesce(sum(
    case
      when tipo in ('ingreso_venta','deposito','transferencia_entrada','ajuste_positivo','apertura') then monto
      when tipo in ('retiro','transferencia_salida','ajuste_negativo') then -monto
      else 0
    end
  ), 0)
  into v_saldo_calculado
  from fintrack_movimientos
  where cuenta_id = p_cuenta_id;

  update fintrack_cuentas
  set saldo_actual = v_saldo_calculado,
      updated_at = now()
  where id = p_cuenta_id;

  return v_saldo_calculado;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 12. Seed automático para tenants
-- ═══════════════════════════════════════════════════════════════

create or replace function fintrack_seed_tenant(
  p_tenant_id uuid,
  p_pais text default 'VE'
) returns void
language plpgsql
as $$
declare
  v_cuenta_caja_ves uuid;
  v_cuenta_caja_usd uuid;
  v_cuenta_bdv_default uuid;
  v_cuenta_zelle_default uuid;
begin
  -- Configurar monedas según país
  if p_pais = 'VE' then
    insert into fintrack_tenant_monedas (tenant_id, moneda_codigo, es_principal, orden)
    values
      (p_tenant_id, 'USD', true, 1),
      (p_tenant_id, 'VES', false, 2)
    on conflict do nothing;
  elsif p_pais = 'MX' then
    insert into fintrack_tenant_monedas (tenant_id, moneda_codigo, es_principal, orden)
    values (p_tenant_id, 'MXN', true, 1)
    on conflict do nothing;
  elsif p_pais = 'CO' then
    insert into fintrack_tenant_monedas (tenant_id, moneda_codigo, es_principal, orden)
    values (p_tenant_id, 'COP', true, 1)
    on conflict do nothing;
  else
    -- Default a USD
    insert into fintrack_tenant_monedas (tenant_id, moneda_codigo, es_principal, orden)
    values (p_tenant_id, 'USD', true, 1)
    on conflict do nothing;
  end if;

  -- Activar formas de pago según país
  if p_pais = 'VE' then
    insert into fintrack_formas_pago_tenant (tenant_id, forma_pago_slug, orden)
    values
      (p_tenant_id, 'efectivo', 10),
      (p_tenant_id, 'tarjeta_pos', 20),
      (p_tenant_id, 'transferencia', 30),
      (p_tenant_id, 'pago_movil', 40),
      (p_tenant_id, 'biopago', 50),
      (p_tenant_id, 'zelle', 60),
      (p_tenant_id, 'credito_cliente', 90)
    on conflict do nothing;
  else
    insert into fintrack_formas_pago_tenant (tenant_id, forma_pago_slug, orden)
    values
      (p_tenant_id, 'efectivo', 10),
      (p_tenant_id, 'tarjeta_pos', 20),
      (p_tenant_id, 'transferencia', 30),
      (p_tenant_id, 'credito_cliente', 90)
    on conflict do nothing;
  end if;

  -- Crear cuentas default según país
  if p_pais = 'VE' then
    -- Caja Bs
    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, orden)
    values (p_tenant_id, 'Caja Bs', 'efectivo', 'VES', 10)
    returning id into v_cuenta_caja_ves;

    -- Caja USD
    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, orden)
    values (p_tenant_id, 'Caja USD', 'efectivo', 'USD', 20)
    returning id into v_cuenta_caja_usd;

    -- BDV empresa (bancaria VES)
    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, banco, orden)
    values (p_tenant_id, 'BDV empresa', 'bancaria', 'VES', 'Banco de Venezuela', 30)
    returning id into v_cuenta_bdv_default;

    -- Zelle (digital USD)
    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, orden)
    values (p_tenant_id, 'Zelle empresa', 'digital', 'USD', 40)
    returning id into v_cuenta_zelle_default;

    -- Vincular cuentas con formas de pago
    insert into fintrack_cuenta_formas_pago (tenant_id, cuenta_id, forma_pago_slug, es_default) values
      (p_tenant_id, v_cuenta_caja_ves, 'efectivo', false),
      (p_tenant_id, v_cuenta_caja_usd, 'efectivo', true),
      (p_tenant_id, v_cuenta_bdv_default, 'tarjeta_pos', true),
      (p_tenant_id, v_cuenta_bdv_default, 'transferencia', true),
      (p_tenant_id, v_cuenta_bdv_default, 'pago_movil', true),
      (p_tenant_id, v_cuenta_bdv_default, 'biopago', true),
      (p_tenant_id, v_cuenta_zelle_default, 'zelle', true)
    on conflict do nothing;
  else
    -- Setup genérico · 1 caja + 1 cuenta bancaria
    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, orden)
    values (p_tenant_id, 'Caja principal', 'efectivo',
      (select moneda_codigo from fintrack_tenant_monedas where tenant_id = p_tenant_id and es_principal = true),
      10)
    returning id into v_cuenta_caja_ves;

    insert into fintrack_cuentas (tenant_id, nombre, tipo, moneda_codigo, banco, orden)
    values (p_tenant_id, 'Cuenta bancaria principal', 'bancaria',
      (select moneda_codigo from fintrack_tenant_monedas where tenant_id = p_tenant_id and es_principal = true),
      'Banco', 20)
    returning id into v_cuenta_bdv_default;

    insert into fintrack_cuenta_formas_pago (tenant_id, cuenta_id, forma_pago_slug, es_default) values
      (p_tenant_id, v_cuenta_caja_ves, 'efectivo', true),
      (p_tenant_id, v_cuenta_bdv_default, 'tarjeta_pos', true),
      (p_tenant_id, v_cuenta_bdv_default, 'transferencia', true)
    on conflict do nothing;
  end if;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 13. Ejecutar seed para el tenant demo (Venezuela)
-- ═══════════════════════════════════════════════════════════════

select fintrack_seed_tenant('00000000-0000-0000-0000-0000000000de'::uuid, 'VE');

-- Registrar tasa inicial USD → VES
insert into fintrack_tasas (tenant_id, moneda_origen, moneda_destino, tasa, fecha, fuente)
values ('00000000-0000-0000-0000-0000000000de', 'USD', 'VES', 36.50, current_date, 'seed')
on conflict do nothing;

insert into fintrack_tasas (tenant_id, moneda_origen, moneda_destino, tasa, fecha, fuente)
values ('00000000-0000-0000-0000-0000000000de', 'VES', 'USD', 0.027397, current_date, 'seed')
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════
-- 14. RLS
-- ═══════════════════════════════════════════════════════════════

alter table fintrack_monedas enable row level security;
alter table fintrack_tenant_monedas enable row level security;
alter table fintrack_tasas enable row level security;
alter table fintrack_formas_pago_catalogo enable row level security;
alter table fintrack_formas_pago_tenant enable row level security;
alter table fintrack_cuentas enable row level security;
alter table fintrack_cuenta_formas_pago enable row level security;
alter table fintrack_movimientos enable row level security;

-- Monedas y formas de pago catálogo: lectura pública para autenticados
drop policy if exists "Leer catálogo monedas" on fintrack_monedas;
create policy "Leer catálogo monedas" on fintrack_monedas
  for select to authenticated using (true);

drop policy if exists "Leer catálogo formas pago" on fintrack_formas_pago_catalogo;
create policy "Leer catálogo formas pago" on fintrack_formas_pago_catalogo
  for select to authenticated using (true);

-- Datos del tenant: lectura para autenticados, escritura solo admin/gerente
drop policy if exists "Leer monedas tenant" on fintrack_tenant_monedas;
create policy "Leer monedas tenant" on fintrack_tenant_monedas
  for select to authenticated using (true);

drop policy if exists "Leer tasas" on fintrack_tasas;
create policy "Leer tasas" on fintrack_tasas
  for select to authenticated using (true);

drop policy if exists "Leer formas pago tenant" on fintrack_formas_pago_tenant;
create policy "Leer formas pago tenant" on fintrack_formas_pago_tenant
  for select to authenticated using (true);

drop policy if exists "Leer cuentas" on fintrack_cuentas;
create policy "Leer cuentas" on fintrack_cuentas
  for select to authenticated using (true);

drop policy if exists "Leer cuenta formas pago" on fintrack_cuenta_formas_pago;
create policy "Leer cuenta formas pago" on fintrack_cuenta_formas_pago
  for select to authenticated using (true);

drop policy if exists "Leer movimientos" on fintrack_movimientos;
create policy "Leer movimientos" on fintrack_movimientos
  for select to authenticated using (true);

-- Escritura de cuentas solo nivel <= 2
drop policy if exists "Admin gestiona cuentas" on fintrack_cuentas;
create policy "Admin gestiona cuentas" on fintrack_cuentas
  for all to authenticated
  using (
    exists (
      select 1 from zytek_users u
      where u.id = auth.uid() and u.nivel <= 2 and u.activo = true
    )
  );

-- Inserción de movimientos: cualquier autenticado (lo hace la función)
drop policy if exists "Insertar movimientos" on fintrack_movimientos;
create policy "Insertar movimientos" on fintrack_movimientos
  for insert to authenticated with check (true);
```

## A.1.2 · Aplicar migración

**Instrucciones para Claude Code:**

1. Crear el archivo `026_fintrack_base.sql` con el contenido completo de arriba
2. NO intentar ejecutar `supabase db push` · la CLI no está linkeada
3. Reportar al usuario: *"Migración creada en supabase/migrations/026_fintrack_base.sql. Aplicar manualmente en Supabase Studio SQL Editor: https://supabase.com/dashboard/project/cpjrcupakyinwjaunqwd/sql/new"*
4. Esperar confirmación del usuario de que aplicó la migración
5. Después de confirmación, ejecutar las queries de verificación (siguiente sección)

## A.1.3 · Queries de verificación post-migración

**Archivo a crear:** `scripts/verify_fintrack_migration.sql` (para referencia)

```sql
-- Verificación 1: Tablas creadas
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name like 'fintrack_%'
order by table_name;
-- Esperado: 8 filas

-- Verificación 2: Monedas base cargadas
select count(*) as total from fintrack_monedas where activo = true;
-- Esperado: 7

-- Verificación 3: Formas de pago catálogo
select count(*) as total from fintrack_formas_pago_catalogo where activo = true;
-- Esperado: 9

-- Verificación 4: Tenant demo configurado con monedas VE
select
  tm.moneda_codigo,
  tm.es_principal,
  m.nombre
from fintrack_tenant_monedas tm
join fintrack_monedas m on m.codigo = tm.moneda_codigo
where tm.tenant_id = '00000000-0000-0000-0000-0000000000de'
order by tm.orden;
-- Esperado: 2 filas (USD principal, VES)

-- Verificación 5: Formas de pago activas en el tenant
select slug, orden
from fintrack_formas_pago_tenant
where tenant_id = '00000000-0000-0000-0000-0000000000de'
  and activa = true
order by orden;
-- Esperado: 7 filas

-- Verificación 6: Cuentas del tenant
select nombre, tipo, moneda_codigo, saldo_actual
from fintrack_cuentas
where tenant_id = '00000000-0000-0000-0000-0000000000de'
order by orden;
-- Esperado: 4 filas (Caja Bs, Caja USD, BDV empresa, Zelle empresa)

-- Verificación 7: Vínculos cuenta ↔ forma de pago
select
  c.nombre as cuenta,
  cfp.forma_pago_slug,
  cfp.es_default
from fintrack_cuenta_formas_pago cfp
join fintrack_cuentas c on c.id = cfp.cuenta_id
where cfp.tenant_id = '00000000-0000-0000-0000-0000000000de'
order by c.nombre, cfp.forma_pago_slug;
-- Esperado: ~7 filas (BDV empresa con 4, Caja USD con efectivo, Caja Bs con efectivo, Zelle con zelle)

-- Verificación 8: Función aplicar_movimiento existe
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'fintrack_aplicar_movimiento';
-- Esperado: 1 fila

-- Verificación 9: Probar aplicar movimiento de apertura (ingreso de $50 a Caja USD)
do $$
declare
  v_cuenta_id uuid;
  v_user_id uuid;
  v_mov_id uuid;
begin
  select id into v_cuenta_id from fintrack_cuentas
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Caja USD' limit 1;

  select id into v_user_id from zytek_users where full_name = 'Admin Demo' limit 1;

  v_mov_id := fintrack_aplicar_movimiento(
    p_tenant_id := '00000000-0000-0000-0000-0000000000de',
    p_cuenta_id := v_cuenta_id,
    p_tipo := 'apertura',
    p_monto := 50.00,
    p_moneda_codigo := 'USD',
    p_usuario_id := v_user_id,
    p_descripcion := 'Saldo inicial de prueba'
  );

  raise notice 'Movimiento creado: %', v_mov_id;
end $$;

-- Verificación 10: Saldo de Caja USD actualizado
select nombre, saldo_actual from fintrack_cuentas
where tenant_id = '00000000-0000-0000-0000-0000000000de'
  and nombre = 'Caja USD';
-- Esperado: saldo_actual = 50.00

-- Verificación 11: Movimiento registrado
select tipo, monto, moneda_codigo, saldo_antes, saldo_despues
from fintrack_movimientos
where tenant_id = '00000000-0000-0000-0000-0000000000de'
order by created_at desc limit 1;
-- Esperado: apertura, 50.00, USD, 0.00, 50.00
```

## A.1.4 · Servicios TypeScript

**Archivos a crear:**

### `src/lib/fintrack/types.ts`

```typescript
export type MonedaCodigo = 'USD' | 'VES' | 'MXN' | 'COP' | 'PEN' | 'ARS' | 'EUR';

export type FormaPagoSlug =
  | 'efectivo'
  | 'tarjeta_pos'
  | 'transferencia'
  | 'pago_movil'
  | 'biopago'
  | 'zelle'
  | 'paypal'
  | 'cripto'
  | 'credito_cliente';

export type CuentaTipo = 'efectivo' | 'bancaria' | 'digital' | 'credito_cliente' | 'otro';

export type MovimientoTipo =
  | 'ingreso_venta'
  | 'deposito'
  | 'retiro'
  | 'transferencia_salida'
  | 'transferencia_entrada'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'apertura';

export interface Moneda {
  codigo: MonedaCodigo;
  nombre: string;
  simbolo: string;
  decimales: number;
}

export interface FormaPago {
  slug: FormaPagoSlug;
  nombre: string;
  descripcion?: string;
  icono?: string;
  requiere_referencia: boolean;
  requiere_cuenta: boolean;
}

export interface Cuenta {
  id: string;
  tenant_id: string;
  nombre: string;
  tipo: CuentaTipo;
  moneda_codigo: MonedaCodigo;
  numero_cuenta?: string;
  titular?: string;
  banco?: string;
  saldo_inicial: number;
  saldo_actual: number;
  notas?: string;
  activa: boolean;
  orden: number;
}

export interface Movimiento {
  id: string;
  tenant_id: string;
  cuenta_id: string;
  tipo: MovimientoTipo;
  monto: number;
  moneda_codigo: MonedaCodigo;
  tasa_usada?: number;
  monto_moneda_principal?: number;
  cuenta_contraparte_id?: string;
  referencia_tipo?: string;
  referencia_id?: string;
  forma_pago_slug?: FormaPagoSlug;
  descripcion?: string;
  usuario_id?: string;
  saldo_antes: number;
  saldo_despues: number;
  created_at: string;
}

export interface AplicarMovimientoInput {
  tenantId: string;
  cuentaId: string;
  tipo: MovimientoTipo;
  monto: number;
  monedaCodigo: MonedaCodigo;
  usuarioId: string;
  referenciaTipo?: string;
  referenciaId?: string;
  formaPagoSlug?: FormaPagoSlug;
  cuentaContraparteId?: string;
  descripcion?: string;
  metadata?: Record<string, unknown>;
}
```

### `src/lib/fintrack/service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import type {
  Cuenta, FormaPago, Moneda, Movimiento,
  AplicarMovimientoInput, FormaPagoSlug
} from './types';

export class FinTrackService {
  private supabase = createClient();

  async listarCuentas(tenantId: string): Promise<Cuenta[]> {
    const { data, error } = await this.supabase
      .from('fintrack_cuentas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden');

    if (error) throw error;
    return data || [];
  }

  async listarFormasPago(tenantId: string): Promise<FormaPago[]> {
    const { data, error } = await this.supabase
      .from('fintrack_formas_pago_tenant')
      .select(`
        forma_pago_slug,
        activa,
        fintrack_formas_pago_catalogo!inner(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden');

    if (error) throw error;
    return (data || []).map((row: any) => row.fintrack_formas_pago_catalogo);
  }

  async cuentasPorFormaPago(tenantId: string, slug: FormaPagoSlug) {
    const { data, error } = await this.supabase.rpc('fintrack_cuentas_por_forma_pago', {
      p_tenant_id: tenantId,
      p_forma_pago_slug: slug
    });

    if (error) throw error;
    return data || [];
  }

  async listarMonedas(tenantId: string): Promise<Moneda[]> {
    const { data, error } = await this.supabase
      .from('fintrack_tenant_monedas')
      .select(`
        moneda_codigo,
        es_principal,
        fintrack_monedas!inner(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden');

    if (error) throw error;
    return (data || []).map((row: any) => row.fintrack_monedas);
  }

  async tasaActual(tenantId: string, origen: string, destino: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('fintrack_tasas')
      .select('tasa')
      .eq('tenant_id', tenantId)
      .eq('moneda_origen', origen)
      .eq('moneda_destino', destino)
      .lte('fecha', new Date().toISOString().split('T')[0])
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.tasa ?? null;
  }

  async aplicarMovimiento(input: AplicarMovimientoInput): Promise<string> {
    const { data, error } = await this.supabase.rpc('fintrack_aplicar_movimiento', {
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
      p_metadata: input.metadata ?? {}
    });

    if (error) throw error;
    return data as string;
  }

  async movimientosPorReferencia(
    tenantId: string,
    tipo: string,
    id: string
  ): Promise<Movimiento[]> {
    const { data, error } = await this.supabase
      .from('fintrack_movimientos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('referencia_tipo', tipo)
      .eq('referencia_id', id)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }
}

export const fintrack = new FinTrackService();
```

## A.1.5 · Commit

Mensaje del commit:

```
feat(fintrack): schema base de tesorería con cuentas multi-moneda

- 7 monedas catalogadas (USD, VES, MXN, COP, PEN, ARS, EUR)
- 9 formas de pago en catálogo (efectivo, tarjeta, transferencia, pago móvil, biopago, zelle, paypal, cripto, crédito)
- Tabla fintrack_cuentas con tipos (efectivo, bancaria, digital, crédito)
- Tabla pivot N:M cuenta_formas_pago para configurar qué métodos recibe cada cuenta
- Libro inmutable fintrack_movimientos con saldo_antes/saldo_despues
- Tasas diarias por tenant
- Función fintrack_aplicar_movimiento con validaciones y audit
- Función fintrack_cuentas_por_forma_pago para UI
- Función fintrack_recalcular_saldo para auditoría
- Seed automático configurable por país (VE con dualidad VES+USD, otros con moneda única)
- Tenant demo configurado con 4 cuentas, 7 formas de pago activas, tasa inicial 36.50
- RLS: lectura autenticada, escritura solo nivel <= 2, movimientos append-only
- Servicio TypeScript FinTrackService con interfaces claras

Preparado para FinTrack enterprise que consumirá estas mismas tablas.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## A.1.6 · Validación manual por el usuario

**Archivo a generar:** `docs/qa/A1_fintrack_tests.md`

```markdown
# QA · Bloque A.1 · FinTrack base

## Pre-condiciones
- Migración 026 aplicada sin errores
- 11 queries de verificación pasan con resultado esperado

## Casos de prueba

### Caso 1 · Listar cuentas del tenant demo
**Query:** `select * from fintrack_cuentas where tenant_id = '00000000-0000-0000-0000-0000000000de'`
**Esperado:** 4 filas · Caja Bs, Caja USD, BDV empresa, Zelle empresa

### Caso 2 · Intentar insertar movimiento con moneda incorrecta
**Query:**
```sql
select fintrack_aplicar_movimiento(
  '00000000-0000-0000-0000-0000000000de',
  (select id from fintrack_cuentas where nombre = 'Caja USD' limit 1),
  'ingreso_venta',
  100.00,
  'VES',
  (select id from zytek_users where full_name = 'Admin Demo' limit 1)
);
```
**Esperado:** ERROR "Moneda VES no coincide con moneda de la cuenta USD"

### Caso 3 · Validar saldo_despues se calcula correctamente
Ingresar $10 a Caja USD y verificar que saldo_actual incrementa en 10.

### Caso 4 · Verificar tasa USD→VES
**Query:** `select tasa from fintrack_tasas where tenant_id = '00000000-0000-0000-0000-0000000000de' and moneda_origen = 'USD' and moneda_destino = 'VES' order by fecha desc limit 1;`
**Esperado:** 36.50

### Caso 5 · Audit log registra el movimiento
**Query:** `select count(*) from pos_audit_trace where action = 'fintrack_movimiento'`
**Esperado:** mayor a 0
```

---

---

# SUB-BLOQUE A.2 · Flujo de cobro

**NO empezar hasta que Daniel confirme A.1 cerrado.**

**Duración estimada:** 3 horas de trabajo de Claude Code
**Objetivo:** Modal de cobro funcional · pago dividido · integración con FinTrack · cierre de comanda

## A.2.1 · Servicio de pago

**Archivo:** `src/lib/payment/types.ts`

```typescript
import type { FormaPagoSlug, MonedaCodigo } from '../fintrack/types';

export interface PagoLinea {
  id: string;
  formaPagoSlug: FormaPagoSlug;
  cuentaId: string;
  monto: number;
  monedaCodigo: MonedaCodigo;
  referencia?: string;
  nota?: string;
}

export interface CobroInput {
  orderId: string;
  tenantId: string;
  cajeroId: string;
  pagos: Omit<PagoLinea, 'id'>[];
  propina?: number;
  descuento?: number;
  notas?: string;
}

export interface CobroResultado {
  orderId: string;
  movimientoIds: string[];
  totalCobrado: number;
  monedaPrincipal: MonedaCodigo;
  timestamp: string;
}
```

**Archivo:** `src/lib/payment/service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { fintrack } from '@/lib/fintrack/service';
import type { CobroInput, CobroResultado } from './types';

export class PaymentService {
  private supabase = createClient();

  async procesarCobro(input: CobroInput): Promise<CobroResultado> {
    // Validar que la suma de pagos = total de la comanda (en moneda principal)
    const { data: order, error: orderErr } = await this.supabase
      .from('pos_orders')
      .select('*')
      .eq('id', input.orderId)
      .single();

    if (orderErr) throw orderErr;
    if (order.estado === 'cobrada') {
      throw new Error('Esta comanda ya fue cobrada');
    }

    // TODO v2: convertir cada pago a moneda principal y validar suma = total

    // Aplicar cada movimiento en FinTrack
    const movimientoIds: string[] = [];
    for (const pago of input.pagos) {
      const movId = await fintrack.aplicarMovimiento({
        tenantId: input.tenantId,
        cuentaId: pago.cuentaId,
        tipo: 'ingreso_venta',
        monto: pago.monto,
        monedaCodigo: pago.monedaCodigo,
        usuarioId: input.cajeroId,
        referenciaTipo: 'pos_order',
        referenciaId: input.orderId,
        formaPagoSlug: pago.formaPagoSlug,
        descripcion: `Venta comanda ${order.numero_comanda}`,
        metadata: {
          mesa_id: order.mesa_id,
          referencia_pago: pago.referencia,
          nota: pago.nota
        }
      });
      movimientoIds.push(movId);
    }

    // Marcar comanda como cobrada
    const { error: updateErr } = await this.supabase
      .from('pos_orders')
      .update({
        estado: 'cobrada',
        paid_at: new Date().toISOString(),
        cajero_id: input.cajeroId,
        propina: input.propina ?? 0,
        descuento: input.descuento ?? 0,
        notes: input.notas
      })
      .eq('id', input.orderId);

    if (updateErr) throw updateErr;

    // Liberar mesa si aplica
    if (order.mesa_id) {
      const { error: mesaErr } = await this.supabase
        .from('mesas')
        .update({
          estado: 'libre',
          mesero_id: null,
          mesero_nombre: null,
          opened_at: null,
          closed_at: new Date().toISOString()
        })
        .eq('id', order.mesa_id);

      if (mesaErr) throw mesaErr;
    }

    // Audit
    await this.supabase.from('pos_audit_trace').insert({
      tenant_id: input.tenantId,
      user_id: input.cajeroId,
      action: 'cobro_completado',
      severity: 'info',
      order_id: input.orderId,
      mesa_id: order.mesa_id,
      metadata: {
        total: order.total,
        pagos_count: input.pagos.length,
        propina: input.propina,
        descuento: input.descuento
      }
    });

    return {
      orderId: input.orderId,
      movimientoIds,
      totalCobrado: input.pagos.reduce((sum, p) => sum + p.monto, 0),
      monedaPrincipal: input.pagos[0].monedaCodigo,
      timestamp: new Date().toISOString()
    };
  }
}

export const paymentService = new PaymentService();
```

## A.2.2 · Hook de cobro

**Archivo:** `src/hooks/usePayment.ts`

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { fintrack } from '@/lib/fintrack/service';
import { paymentService } from '@/lib/payment/service';
import type { FormaPago, Cuenta } from '@/lib/fintrack/types';
import type { CobroInput, CobroResultado, PagoLinea } from '@/lib/payment/types';

export function usePayment(tenantId: string) {
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [fp, cu] = await Promise.all([
          fintrack.listarFormasPago(tenantId),
          fintrack.listarCuentas(tenantId)
        ]);
        setFormasPago(fp);
        setCuentas(cu);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [tenantId]);

  const cuentasDisponibles = useCallback(
    async (formaPagoSlug: string) => {
      return fintrack.cuentasPorFormaPago(tenantId, formaPagoSlug as any);
    },
    [tenantId]
  );

  const procesarCobro = useCallback(
    async (input: CobroInput): Promise<CobroResultado> => {
      return paymentService.procesarCobro(input);
    },
    []
  );

  return { formasPago, cuentas, loading, error, cuentasDisponibles, procesarCobro };
}
```

## A.2.3 · Componentes UI

**Archivo:** `src/components/pos/cobro/PaymentMethodSelector.tsx`

- Grid de botones con iconos
- Cada botón representa una forma de pago activa
- Al seleccionar, dispara callback con `formaPagoSlug`
- Si la forma tiene múltiples cuentas, abre dropdown de cuentas

**Archivo:** `src/components/pos/cobro/PaymentLineItem.tsx`

- Fila de pago en la lista de "Pagos registrados"
- Muestra: forma + cuenta + monto + moneda
- Botón X para eliminar línea

**Archivo:** `src/components/pos/cobro/SplitPaymentPanel.tsx`

- Componente principal del modal de cobro
- Lado izquierdo: selector de método + input de monto + botón "Agregar pago"
- Lado derecho: lista de pagos registrados (con total, pendiente, vuelto)
- Footer: botón "Confirmar cobro" (disabled si pendiente > 0)

**Archivo:** `src/components/pos/cobro/CobroConfirmacionModal.tsx`

- Modal breve después de confirmar
- Muestra resumen: total cobrado, método(s), comanda #, mesa, cajero
- Botones: "Imprimir ticket" (por ahora solo logs), "Listo" (cierra y regresa a mesas)

## A.2.4 · Integración en el POS

**Modificar:** `src/app/pos/page.tsx`

- Importar `SplitPaymentPanel`
- Al tocar botón "Cobrar" (F2), abrir modal con `SplitPaymentPanel`
- Al completar cobro, mostrar `CobroConfirmacionModal`
- Al cerrar confirmación, `router.push('/pos')` para regresar a grilla

## A.2.5 · Commit

```
feat(pos): flujo de cobro con pago dividido y múltiples cuentas

- PaymentService.procesarCobro: aplica N movimientos en FinTrack, marca comanda cobrada, libera mesa, audit
- Hook usePayment con carga reactiva de formas y cuentas
- Modal SplitPaymentPanel con pago dividido (ej $10 Zelle + $3.20 efectivo)
- Selector de método con iconos · cada uno dispara selector de cuenta
- Panel de pagos registrados con cálculo en vivo de pendiente y vuelto
- Modal de confirmación con resumen y return a mesas
- Integración con botón F2 del POS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## A.2.6 · QA Manual

**Archivo:** `docs/qa/A2_cobro_tests.md`

Casos a probar manualmente:

1. Abrir Mesa 1 con Admin Demo
2. Agregar item "Pizza Margarita" ($12)
3. Tocar F2 Cobrar
4. Aparece modal con selector de métodos
5. Seleccionar "Efectivo" → seleccionar cuenta Caja USD → monto $12 → Agregar
6. Pendiente = 0 → botón Confirmar se habilita
7. Confirmar → modal de éxito
8. Tocar "Listo" → regresa a grilla de mesas
9. Mesa 1 ahora está libre
10. Verificar en DB: movimiento registrado en fintrack_movimientos, comanda en estado 'cobrada', Caja USD con saldo actualizado
11. Repetir con pago dividido: $10 Zelle + $2 efectivo

---

---

# SUB-BLOQUE A.3 · Fix de Enviar a Mesas

**NO empezar hasta que Daniel confirme A.2 cerrado.**

**Duración estimada:** 30 minutos
**Objetivo:** Bug visible en captura 3 · al enviar comanda a cocina, regresar a grilla de mesas

## A.3.1 · Diagnóstico

**Archivo a leer:** `src/app/pos/page.tsx` (o donde esté el handler del botón "Enviar")

Buscar la función que maneja el click del botón "Enviar" (línea que contiene `enviado_cocina` o similar).

Actualmente probablemente solo hace el UPDATE a los items. Falta el `router.push('/pos')` o el cambio de tab a "MESAS".

## A.3.2 · Fix

Después del UPDATE de items a `enviado_cocina = true`, agregar:

```typescript
// Después de marcar items como enviados
toast.success(`Comanda enviada a cocina`);

// Regresar a la grilla de mesas
setActiveTab('mesas'); // si usa tabs internos
// O si usa router:
// router.push('/pos');
```

Si usa el toggle de tabs (MESAS | COMANDA) como muestra la captura, solo cambiar el estado local.

## A.3.3 · Commit

```
fix(pos): regresar a grilla de mesas al enviar comanda a cocina

Antes: al tocar Enviar se marcaban items como enviados pero la vista quedaba
en la pantalla de comanda con el botón Enviar desactivado.
Ahora: después de enviar, la vista cambia automáticamente al tab MESAS para
que el mesero pueda atender otra mesa.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## A.3.4 · QA Manual

1. Abrir Mesa 2
2. Agregar un item
3. Tocar Enviar
4. Verificar que se muestre toast "Comanda enviada"
5. Verificar que la vista cambie a MESAS
6. Mesa 2 sigue ocupada (no se libera hasta cobrar)

---

---

# 🏁 Criterio de cierre del Bloque A

El Bloque A está CERRADO solo cuando:

- [ ] A.1: migración aplicada, 11 queries de verificación pasan, commit hecho
- [ ] A.1: QA manual A1 completo · 5 casos pasan
- [ ] A.2: servicios y UI implementados, commit hecho
- [ ] A.2: QA manual A2 completo · 11 pasos del flujo cobro pasan (simple y dividido)
- [ ] A.3: fix aplicado, commit hecho
- [ ] A.3: QA manual A3 completo · 6 pasos pasan
- [ ] Daniel confirma explícitamente: "Bloque A cerrado"

Solo entonces se puede avanzar al Bloque B (Sidebar + Permisos).

---

# 📋 Checkpoint · si Claude Code se interrumpe

Si por cualquier razón la ejecución se detiene (memoria, timeout, error inesperado), Claude Code debe:

1. Escribir `CHECKPOINT.md` en la raíz del repo con:
   - Sub-bloque actual (A.1, A.2 o A.3)
   - Archivos completados
   - Archivos pendientes
   - Último error si hubo
   - Queries pendientes de ejecutar
2. Hacer commit con lo que haya
3. Reportar a Daniel: *"Checkpoint guardado. Puedes retomar pidiéndome continuar desde el archivo CHECKPOINT.md"*

---

# 🙏 Notas finales para Claude Code

- Daniel NO está frente a la PC durante este trabajo. Ejecuta todo lo que puedas autónomamente.
- Donde necesites intervención humana (aplicar SQL en Supabase Studio), detente y reporta con instrucciones claras.
- Si encuentras que el schema real difiere del descrito aquí (por ejemplo columnas con nombres distintos), reporta ANTES de hacer workaround. Prefiero corregir el plan que tener bugs silenciosos.
- Commits pequeños y descriptivos. Prefiero 5 commits limpios que 1 commit mega.
- Al terminar cada sub-bloque, genera el archivo de tests manual correspondiente en `docs/qa/`.
- Si algo te deja dudas, deja un `// TODO v2:` explícito y sigue · pero REPORTA esos TODOs al final para que Daniel los revise.

**Buena suerte. Que el bloque quede pulido.**
