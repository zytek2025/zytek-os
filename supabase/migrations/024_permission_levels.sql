-- ======================================================
-- 024 — Sistema de permisos por nivel
-- Reemplaza pos_roles_config (021) con catálogo plano
-- ======================================================

-- ======================================================
-- 0. Limpiar sistema viejo (021 — pos_roles_config)
-- ======================================================

drop trigger if exists seed_permissions_on_tenant_insert on tenants;
drop function if exists trigger_seed_permissions_on_tenant_create();
drop function if exists seed_default_permissions(uuid);
drop table if exists pos_roles_config;

-- ======================================================
-- 1. Catálogo de permisos por tenant
-- ======================================================

create table if not exists pos_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  label text not null,
  category text not null,
  nivel_minimo int not null check (nivel_minimo between 1 and 5),
  description text,
  is_universal boolean generated always as (nivel_minimo = 5) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, slug)
);

create index if not exists idx_permissions_tenant on pos_permissions(tenant_id);
create index if not exists idx_permissions_slug on pos_permissions(tenant_id, slug);

-- ======================================================
-- 2. Columnas adicionales en zytek_users
-- (nivel y activo ya existen desde 001_initial)
-- ======================================================

alter table zytek_users
  add column if not exists last_login_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references zytek_users(id);

-- ======================================================
-- 3. Función user_can()
-- ======================================================

create or replace function user_can(
  p_user_id uuid,
  p_permission text
) returns boolean
language plpgsql stable
as $$
declare
  v_user_nivel int;
  v_user_tenant uuid;
  v_perm_nivel int;
begin
  select nivel, tenant_id into v_user_nivel, v_user_tenant
  from zytek_users
  where id = p_user_id and activo = true;

  if v_user_nivel is null then
    return false;
  end if;

  select nivel_minimo into v_perm_nivel
  from pos_permissions
  where tenant_id = v_user_tenant and slug = p_permission;

  if v_perm_nivel is null then
    return false;
  end if;

  return v_user_nivel <= v_perm_nivel;
end;
$$;

-- ======================================================
-- 4. Función para listar permisos de un usuario
-- ======================================================

create or replace function user_permissions(p_user_id uuid)
returns table (
  slug text,
  label text,
  category text,
  nivel_minimo int
)
language plpgsql stable
as $$
declare
  v_user_nivel int;
  v_user_tenant uuid;
begin
  select nivel, tenant_id into v_user_nivel, v_user_tenant
  from zytek_users
  where id = p_user_id and activo = true;

  if v_user_nivel is null then
    return;
  end if;

  return query
  select p.slug, p.label, p.category, p.nivel_minimo
  from pos_permissions p
  where p.tenant_id = v_user_tenant
    and v_user_nivel <= p.nivel_minimo
  order by p.category, p.nivel_minimo desc, p.label;
end;
$$;

-- ======================================================
-- 5. Seed de los 25 permisos por tenant
-- ======================================================

create or replace function seed_default_permissions(p_tenant_id uuid)
returns void
language plpgsql
as $$
begin
  insert into pos_permissions (tenant_id, slug, label, category, nivel_minimo, description)
  values
  -- Operación POS (universal, nivel 5)
  (p_tenant_id, 'abrirMesa', 'Abrir mesa', 'Operación POS', 5, 'Iniciar una nueva mesa con el PIN del mesero'),
  (p_tenant_id, 'tomarPedido', 'Tomar pedido', 'Operación POS', 5, 'Agregar ítems a la comanda de una mesa'),
  (p_tenant_id, 'enviarCocina', 'Enviar a cocina', 'Operación POS', 5, 'Enviar la comanda al KDS de cocina'),
  (p_tenant_id, 'agregarExtras', 'Agregar extras', 'Operación POS', 5, 'Agregar modificadores o extras a los ítems'),
  (p_tenant_id, 'generarNota', 'Generar nota', 'Operación POS', 5, 'Imprimir o enviar nota de consumo'),
  (p_tenant_id, 'transferirMesa', 'Transferir mesa', 'Operación POS', 5, 'Mover una comanda a otra mesa'),
  (p_tenant_id, 'unirMesas', 'Unir mesas', 'Operación POS', 5, 'Juntar dos o más mesas en una comanda'),
  (p_tenant_id, 'dividirCuenta', 'Dividir cuenta', 'Operación POS', 5, 'Separar una comanda en varias cuentas'),

  -- Caja (nivel 4)
  (p_tenant_id, 'cobrarMesa', 'Cobrar mesa', 'Caja', 4, 'Procesar el pago de una mesa'),
  (p_tenant_id, 'anularItem', 'Anular ítem', 'Caja', 4, 'Eliminar un ítem antes de enviarlo a cocina'),
  (p_tenant_id, 'aplicarDescuento', 'Aplicar descuento', 'Caja', 4, 'Aplicar descuento hasta 10 por ciento'),
  (p_tenant_id, 'corteX', 'Corte X', 'Caja', 4, 'Reporte parcial de caja sin cerrar turno'),

  -- Supervisión (nivel 3)
  (p_tenant_id, 'anularItemPostCocina', 'Anular ítem post-cocina', 'Supervisión', 3, 'Eliminar ítem ya enviado a cocina'),
  (p_tenant_id, 'descuentoMayor10', 'Descuento mayor a 10%', 'Supervisión', 3, 'Aplicar descuentos mayores al 10 por ciento'),
  (p_tenant_id, 'cerrarMesaSinCobrar', 'Cerrar mesa sin cobrar', 'Supervisión', 3, 'Cerrar una comanda sin cobrar'),
  (p_tenant_id, 'reabrirMesa', 'Reabrir mesa', 'Supervisión', 3, 'Reabrir una comanda ya cerrada'),
  (p_tenant_id, 'cambiarMesero', 'Cambiar mesero', 'Supervisión', 3, 'Reasignar una mesa a otro mesero'),
  (p_tenant_id, 'corteZ', 'Corte Z', 'Supervisión', 3, 'Cierre definitivo de turno'),

  -- Admin (nivel 2)
  (p_tenant_id, 'verReportesVentas', 'Ver reportes de ventas', 'Admin', 2, 'Acceder a reportes básicos de ventas'),
  (p_tenant_id, 'verReportesCompletos', 'Ver reportes completos', 'Admin', 2, 'Acceder a todos los reportes'),
  (p_tenant_id, 'accederAdmin', 'Acceder al Admin ERP', 'Admin', 2, 'Entrar al módulo de administración'),
  (p_tenant_id, 'gestionarUsuarios', 'Gestionar usuarios', 'Admin', 2, 'Crear, editar y desactivar usuarios'),

  -- Sistema (nivel 1)
  (p_tenant_id, 'verAuditLog', 'Ver audit log', 'Sistema', 1, 'Acceder al log completo de auditoría'),
  (p_tenant_id, 'gestionarIntegraciones', 'Gestionar integraciones', 'Sistema', 1, 'Configurar Stripe, Resend, APIs externas'),
  (p_tenant_id, 'eliminarUsuarios', 'Eliminar usuarios', 'Sistema', 1, 'Eliminación permanente de usuarios')
  on conflict (tenant_id, slug) do update
  set label = excluded.label,
      category = excluded.category,
      description = excluded.description,
      updated_at = now();
      -- NOTA: no actualizamos nivel_minimo en conflict para preservar
      -- configuraciones que el tenant haya cambiado
end;
$$;

-- ======================================================
-- 6. Sembrar para tenants existentes
-- ======================================================

do $$
declare
  t record;
begin
  for t in select id from tenants loop
    perform seed_default_permissions(t.id);
  end loop;
end $$;

-- ======================================================
-- 7. Trigger para nuevos tenants
-- ======================================================

create or replace function trigger_seed_permissions_on_tenant()
returns trigger language plpgsql
as $$
begin
  perform seed_default_permissions(new.id);
  return new;
end;
$$;

drop trigger if exists seed_permissions_on_tenant_insert on tenants;

create trigger seed_permissions_on_tenant_insert
after insert on tenants
for each row
execute function trigger_seed_permissions_on_tenant();

-- ======================================================
-- 8. Audit log de cambios de usuarios
-- ======================================================

create table if not exists pos_user_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_id uuid references zytek_users(id),
  target_user_id uuid references zytek_users(id),
  action text not null,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_user_audit_target on pos_user_audit(target_user_id, created_at desc);
create index if not exists idx_user_audit_tenant on pos_user_audit(tenant_id, created_at desc);

-- ======================================================
-- 9. RLS
-- ======================================================

alter table pos_permissions enable row level security;
alter table pos_user_audit enable row level security;

drop policy if exists "Leer permisos del tenant" on pos_permissions;
create policy "Leer permisos del tenant"
  on pos_permissions for select to authenticated
  using (true);

drop policy if exists "Admin y gerente configuran permisos" on pos_permissions;
create policy "Admin y gerente configuran permisos"
  on pos_permissions for update to authenticated
  using (
    exists (
      select 1 from zytek_users u
      where u.id = auth.uid() and u.nivel <= 2 and u.activo = true
    )
  );

drop policy if exists "Leer audit de usuarios" on pos_user_audit;
create policy "Leer audit de usuarios"
  on pos_user_audit for select to authenticated
  using (true);

drop policy if exists "Insertar audit de usuarios" on pos_user_audit;
create policy "Insertar audit de usuarios"
  on pos_user_audit for insert to authenticated
  with check (true);
