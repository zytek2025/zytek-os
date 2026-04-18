-- Tabla de contadores por tenant
create table if not exists pos_order_counters (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  last_number int not null default 0,
  updated_at timestamptz default now()
);

-- Función atómica que incrementa y devuelve siguiente número
create or replace function next_numero_comanda(p_tenant_id uuid)
returns text
language plpgsql
as $$
declare
  v_next int;
begin
  insert into pos_order_counters (tenant_id, last_number)
  values (p_tenant_id, 1)
  on conflict (tenant_id)
  do update set
    last_number = pos_order_counters.last_number + 1,
    updated_at = now()
  returning last_number into v_next;

  return lpad(v_next::text, 5, '0');
end;
$$;

-- Agregar columna numero_comanda si no existe
alter table pos_orders
  add column if not exists numero_comanda text;

-- Índice para búsqueda rápida por número
create index if not exists idx_pos_orders_numero_comanda
  on pos_orders(tenant_id, numero_comanda);

-- Trigger para asignar automáticamente al insertar
create or replace function assign_numero_comanda()
returns trigger
language plpgsql
as $$
begin
  if new.numero_comanda is null or new.numero_comanda = '' then
    new.numero_comanda := next_numero_comanda(new.tenant_id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_numero_comanda on pos_orders;

create trigger set_numero_comanda
before insert on pos_orders
for each row
execute function assign_numero_comanda();
