-- ═══════════════════════════════════════════════════════════════
-- ZytekOS · FinTrack base
-- Tesorería multi-moneda · cuentas · libro inmutable de movimientos
-- Migración 026
-- ═══════════════════════════════════════════════════════════════

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
-- Nota: el INSERT al audit usa el schema real de pos_audit_trace:
-- entity_type/entity_id/data_after (no target_type/target_id/metadata).
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

  -- Audit (usando columnas reales de pos_audit_trace)
  insert into pos_audit_trace (
    tenant_id, user_id, action, entity_type, entity_id, data_after, reason
  ) values (
    p_tenant_id, p_usuario_id, 'fintrack_movimiento',
    'fintrack_movimiento', v_movimiento_id,
    jsonb_build_object(
      'tipo', p_tipo,
      'monto', p_monto,
      'moneda', p_moneda_codigo,
      'cuenta_id', p_cuenta_id,
      'saldo_antes', v_saldo_antes,
      'saldo_despues', v_saldo_despues,
      'forma_pago_slug', p_forma_pago_slug,
      'referencia_tipo', p_referencia_tipo,
      'referencia_id', p_referencia_id
    ),
    p_descripcion
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
