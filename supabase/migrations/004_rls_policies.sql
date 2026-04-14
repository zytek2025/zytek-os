-- ═══════════════════════════════════════════════════════════════
--  ZytekOS — RLS Policies Migration
--  Multi-tenant: Row Level Security Policies por tenant_id
--  IMPORTANTE: Requiere que todas las tablas tengan tenant_id
-- ═══════════════════════════════════════════════════════════════

-- ── Drop existing policies (if any) ────────────────────────────
drop policy if exists "Users can view own tenant"        on zytek_users;
drop policy if exists "Users can insert own tenant"      on zytek_users;
drop policy if exists "Users can update own tenant"      on zytek_users;
drop policy if exists "Service role full access"          on zytek_users;

drop policy if exists "Menu items view own tenant"       on menu_items;
drop policy if exists "Menu items modify own tenant"      on menu_items;

drop policy if exists "Inventario view own tenant"       on inventario;
drop policy if exists "Inventario modify own tenant"     on inventario;

drop policy if exists "Turnos view own tenant"           on turnos;
drop policy if exists "Turnos modify own tenant"         on turnos;

drop policy if exists "Ventas view own tenant"           on ventas;
drop policy if exists "Ventas insert own tenant"         on ventas;
drop policy if exists "Ventas modify own tenant"         on ventas;

drop policy if exists "Clientes view own tenant"         on clientes;
drop policy if exists "Clientes modify own tenant"      on clientes;

drop policy if exists "CxC view own tenant"              on cuentas_por_cobrar;
drop policy if exists "CxC modify own tenant"             on cuentas_por_cobrar;

drop policy if exists "Inv movimientos view own tenant"   on inv_movimientos;
drop policy if exists "Inv movimientos insert own tenant" on inv_movimientos;

drop policy if exists "Cortes Z view own tenant"        on cortes_z;
drop policy if exists "Cortes Z insert own tenant"       on cortes_z;

drop policy if exists "Audit log view own tenant"        on audit_log;
drop policy if exists "Audit log insert own tenant"      on audit_log;

drop policy if exists "Tenants can view own record"      on tenants;
drop policy if exists "Licenses can view own tenant"    on zytek_licenses;

-- ── Helper function to get current JWT claims ──────────────────
create or replace function auth.jwt_tenant_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claim_tenant_id', true), '')::uuid;
$$ language sql stable;

create or replace function auth.jwt_user_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claim_sub', true), '')::uuid;
$$ language sql stable;

-- ── zytek_users policies ──────────────────────────────────────
create policy "Users can view own tenant"
  on zytek_users for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Users can insert own tenant"
  on zytek_users for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Users can update own tenant"
  on zytek_users for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

-- Service role bypass
create policy "Service role full access zytek_users"
  on zytek_users for all
  using (auth.role() = 'service_role');

-- ── menu_items policies ───────────────────────────────────────
create policy "Menu items view own tenant"
  on menu_items for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Menu items insert own tenant"
  on menu_items for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Menu items update own tenant"
  on menu_items for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Menu items delete own tenant"
  on menu_items for delete
  using (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access menu_items"
  on menu_items for all
  using (auth.role() = 'service_role');

-- ── inventario policies ──────────────────────────────────────
create policy "Inventario view own tenant"
  on inventario for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Inventario insert own tenant"
  on inventario for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Inventario update own tenant"
  on inventario for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access inventario"
  on inventario for all
  using (auth.role() = 'service_role');

-- ── turnos policies ───────────────────────────────────────────
create policy "Turnos view own tenant"
  on turnos for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Turnos insert own tenant"
  on turnos for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Turnos update own tenant"
  on turnos for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access turnos"
  on turnos for all
  using (auth.role() = 'service_role');

-- ── ventas policies ────────────────────────────────────────────
create policy "Ventas view own tenant"
  on ventas for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Ventas insert own tenant"
  on ventas for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Ventas update own tenant"
  on ventas for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access ventas"
  on ventas for all
  using (auth.role() = 'service_role');

-- ── clientes policies ──────────────────────────────────────────
create policy "Clientes view own tenant"
  on clientes for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Clientes insert own tenant"
  on clientes for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Clientes update own tenant"
  on clientes for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access clientes"
  on clientes for all
  using (auth.role() = 'service_role');

-- ── cuentas_por_cobrar policies ────────────────────────────────
create policy "CxC view own tenant"
  on cuentas_por_cobrar for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "CxC insert own tenant"
  on cuentas_por_cobrar for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "CxC update own tenant"
  on cuentas_por_cobrar for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access CxC"
  on cuentas_por_cobrar for all
  using (auth.role() = 'service_role');

-- ── inv_movimientos policies ──────────────────────────────────
create policy "Inv movimientos view own tenant"
  on inv_movimientos for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Inv movimientos insert own tenant"
  on inv_movimientos for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access inv_movimientos"
  on inv_movimientos for all
  using (auth.role() = 'service_role');

-- ── cortes_z policies ─────────────────────────────────────────
create policy "Cortes Z view own tenant"
  on cortes_z for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Cortes Z insert own tenant"
  on cortes_z for insert
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Cortes Z update own tenant"
  on cortes_z for update
  using (tenant_id = auth.jwt_tenant_id())
  with check (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access cortes_z"
  on cortes_z for all
  using (auth.role() = 'service_role');

-- ── audit_log policies ────────────────────────────────────────
create policy "Audit log view own tenant"
  on audit_log for select
  using (tenant_id = auth.jwt_tenant_id() or tenant_id is null);

create policy "Audit log insert own tenant"
  on audit_log for insert
  with check (tenant_id = auth.jwt_tenant_id() or tenant_id is null);

create policy "Service role full access audit_log"
  on audit_log for all
  using (auth.role() = 'service_role');

-- ── tenants policies ──────────────────────────────────────────
create policy "Tenants can view own record"
  on tenants for select
  using (id = auth.jwt_tenant_id());

create policy "Service role full access tenants"
  on tenants for all
  using (auth.role() = 'service_role');

-- ── zytek_licenses policies ───────────────────────────────────
create policy "Licenses can view own tenant"
  on zytek_licenses for select
  using (tenant_id = auth.jwt_tenant_id());

create policy "Service role full access licenses"
  on zytek_licenses for all
  using (auth.role() = 'service_role');

-- ── Verify all policies are created ───────────────────────────
do $$
declare
  policy_count int;
  table_count int;
begin
  select count(*) into policy_count from pg_policies where schemaname = 'public';
  select count(*) into table_count from information_schema.tables 
    where table_schema = 'public' 
    and table_type = 'BASE TABLE';
  
  raise notice 'RLS Policies created: %', policy_count;
  raise notice 'Tables with policies: %', table_count;
end $$;
