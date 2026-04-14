-- ═══════════════════════════════════════════════════════════════
--  ZytekOS — Initial Schema
--  Multi-tenant: todo tiene tenant_id
--  RLS habilitado en todas las tablas
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Tenants ──────────────────────────────────────────────────
create table tenants (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  pais        text not null default 've',
  tasa        numeric(12,4) default 36.5,
  plan        text not null default 'basic' check (plan in ('basic','pro','ent')),
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ── Licenses ─────────────────────────────────────────────────
create table zytek_licenses (
  id           uuid primary key default uuid_generate_v4(),
  key          text not null unique,
  tenant_id    uuid references tenants(id) on delete cascade,
  tenant_name  text not null,
  plan         text not null check (plan in ('basic','pro','ent')),
  modules      text[] default array['*'],
  max_users    int default 5,
  expires_at   date not null,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ── Users ────────────────────────────────────────────────────
create table zytek_users (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  nombre      text not null,
  pin_hash    text not null,
  nivel       int not null default 4 check (nivel between 1 and 5),
  rol         text not null default 'Cajero',
  color       text default '#ff7c20',
  activo      boolean default true,
  created_at  timestamptz default now()
);
create index on zytek_users(tenant_id);

-- ── Menu Items ────────────────────────────────────────────────
create table menu_items (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid references tenants(id) on delete cascade not null,
  nombre       text not null,
  cat          text,
  precio       numeric(12,2) not null default 0,
  precio_matriz jsonb,
  modificadores uuid[],
  receta       jsonb,
  activo       boolean default true,
  emoji        text,
  descripcion  text,
  kds_station  text,
  created_at   timestamptz default now()
);
create index on menu_items(tenant_id, cat);

-- ── Inventario ───────────────────────────────────────────────
create table inventario (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid references tenants(id) on delete cascade not null,
  nom          text not null,
  cat          text,
  uni          text default 'und',
  stock        numeric(12,3) default 0,
  min          numeric(12,3) default 0,
  costo        numeric(12,2) default 0,
  ubicacion_id text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on inventario(tenant_id);

-- ── Turnos ───────────────────────────────────────────────────
create table turnos (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  cajero_id   uuid references zytek_users(id),
  cajero      text,
  apertura    timestamptz default now(),
  cierre      timestamptz,
  estado      text default 'activo' check (estado in ('activo','cerrado_x','cerrado_z')),
  fondo       numeric(12,2) default 0,
  created_at  timestamptz default now()
);
create index on turnos(tenant_id, estado);

-- ── Ventas ───────────────────────────────────────────────────
create table ventas (
  id           uuid primary key,
  tenant_id    uuid references tenants(id) on delete cascade not null,
  turno_id     uuid references turnos(id),
  mesa         text,
  cliente_id   uuid,
  items        jsonb not null default '[]',
  total        numeric(12,2) not null default 0,
  total_bs     numeric(14,2),
  formas_pago  jsonb default '[]',
  iva          numeric(12,2) default 0,
  igtf         numeric(12,2) default 0,
  cajero       text,
  tipo         text default 'venta' check (tipo in ('venta','devolucion')),
  ts           bigint,
  created_at   timestamptz default now()
);
create index on ventas(tenant_id, turno_id);
create index on ventas(tenant_id, created_at desc);

-- ── Clientes ─────────────────────────────────────────────────
create table clientes (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  nombre      text not null,
  tel         text,
  email       text,
  visitas     int default 0,
  gasto       numeric(14,2) default 0,
  cxc         numeric(14,2) default 0,
  adelanto    numeric(14,2) default 0,
  puntos      int default 0,
  nivel       text default 'Bronce',
  tipo        text default 'regular',
  estado      text default 'activo',
  ultima      timestamptz,
  created_at  timestamptz default now()
);
create index on clientes(tenant_id);

-- ── Cuentas por Cobrar ───────────────────────────────────────
create table cuentas_por_cobrar (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  cliente_id  uuid references clientes(id),
  concepto    text not null,
  total       numeric(12,2) not null,
  pagado      numeric(12,2) default 0,
  saldo       numeric(12,2) not null,
  fecha       date default current_date,
  vence       date,
  estado      text default 'activa' check (estado in ('activa','pagada','vencida')),
  created_at  timestamptz default now()
);

-- ── Movimientos de Inventario ────────────────────────────────
create table inv_movimientos (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade not null,
  item_id     uuid references inventario(id),
  tipo        text check (tipo in ('entrada','salida','ajuste','conteo')),
  cantidad    numeric(12,3),
  stock_ant   numeric(12,3),
  stock_nvo   numeric(12,3),
  ref         text,
  user_name   text,
  ts          bigint,
  created_at  timestamptz default now()
);
create index on inv_movimientos(tenant_id, created_at desc);

-- ── Cortes Z ─────────────────────────────────────────────────
create table cortes_z (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade not null,
  turno_id        text,
  cajero          text,
  apertura        timestamptz,
  cierre          timestamptz default now(),
  total_ventas    numeric(14,2),
  total_bs        numeric(16,2),
  total_tickets   int,
  formas_pago     jsonb,
  iva             numeric(12,2),
  igtf            numeric(12,2),
  tasa            numeric(12,4),
  checksum        text,
  checksum_nube   text,
  validado        boolean default false,
  sincronizado    boolean default false,
  tx_count        int default 0,
  version         text,
  created_at      timestamptz default now()
);
create index on cortes_z(tenant_id, created_at desc);

-- ── Audit Log ────────────────────────────────────────────────
create table audit_log (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  evento      text not null,
  detalle     text,
  user_name   text,
  ip          text,
  created_at  timestamptz default now()
);
create index on audit_log(tenant_id, created_at desc);

-- ── RPC: Descontar stock ─────────────────────────────────────
create or replace function descontar_stock(
  p_tenant_id uuid, p_item_id uuid, p_cantidad numeric, p_ref text, p_user text
) returns void language plpgsql as $$
declare v_stock_ant numeric;
begin
  select stock into v_stock_ant from inventario where id = p_item_id and tenant_id = p_tenant_id;
  update inventario set stock = stock - p_cantidad, updated_at = now()
    where id = p_item_id and tenant_id = p_tenant_id;
  insert into inv_movimientos(tenant_id, item_id, tipo, cantidad, stock_ant, stock_nvo, ref, user_name, ts, created_at)
    values(p_tenant_id, p_item_id, 'salida', p_cantidad, v_stock_ant, v_stock_ant - p_cantidad, p_ref, p_user, extract(epoch from now())::bigint, now());
end;
$$;

-- ── RPC: Incrementar cliente ──────────────────────────────────
create or replace function incrementar_cliente(
  p_tenant_id uuid, p_cliente_id uuid, p_gasto numeric
) returns void language plpgsql as $$
begin
  update clientes set visitas = visitas + 1, gasto = gasto + p_gasto, ultima = now()
    where id = p_cliente_id and tenant_id = p_tenant_id;
end;
$$;

-- ── RLS Policies ─────────────────────────────────────────────
alter table tenants           enable row level security;
alter table zytek_licenses    enable row level security;
alter table zytek_users       enable row level security;
alter table menu_items        enable row level security;
alter table inventario        enable row level security;
alter table ventas            enable row level security;
alter table clientes          enable row level security;
alter table cuentas_por_cobrar enable row level security;
alter table inv_movimientos   enable row level security;
alter table cortes_z          enable row level security;
alter table audit_log         enable row level security;
alter table turnos            enable row level security;

-- Service role bypasses RLS (used by server-side API only)
-- Anon/authenticated users are restricted to their own tenant
-- (In production, add proper RLS policies per tenant_id)
