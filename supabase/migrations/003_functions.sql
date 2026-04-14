-- ═══════════════════════════════════════════════════════════════
--  ZytekOS — PostgreSQL Functions & RPC
-- ═══════════════════════════════════════════════════════════════

-- ── Calcular checksum de un turno (para validación Corte Z) ──
create or replace function get_turno_checksum(p_tenant_id uuid, p_turno_id text)
returns json language plpgsql as $$
declare
  v_ids    text;
  v_hash   text;
  v_count  int;
begin
  select string_agg(id::text, ',' order by id), count(*)
  into   v_ids, v_count
  from   ventas
  where  tenant_id = p_tenant_id
  and    turno_id  = p_turno_id::uuid;

  -- Simple hash (mismo algoritmo que el frontend)
  v_hash := md5(coalesce(v_ids, '') || p_turno_id);
  return json_build_object('checksum', v_hash, 'count', v_count);
end;
$$;

-- ── Resumen de ventas del día ──────────────────────────────────
create or replace function resumen_ventas_dia(p_tenant_id uuid, p_fecha date default current_date)
returns json language plpgsql as $$
declare v_result json;
begin
  select json_build_object(
    'total',    coalesce(sum(total), 0),
    'tickets',  count(*),
    'promedio', coalesce(avg(total), 0),
    'iva',      coalesce(sum(iva), 0),
    'igtf',     coalesce(sum(igtf), 0)
  ) into v_result
  from ventas
  where tenant_id = p_tenant_id
  and   date_trunc('day', created_at) = p_fecha
  and   tipo = 'venta';
  return v_result;
end;
$$;

-- ── Actualizar nivel de fidelización automáticamente ──────────
create or replace function actualizar_nivel_fidelizacion()
returns trigger language plpgsql as $$
begin
  new.nivel := case
    when new.puntos >= 2500 then 'VIP'
    when new.puntos >= 1000 then 'Oro'
    when new.puntos >= 500  then 'Plata'
    else 'Bronce'
  end;
  return new;
end;
$$;

create trigger trg_nivel_fidelizacion
  before insert or update of puntos on clientes
  for each row execute function actualizar_nivel_fidelizacion();

-- ── Alerta automática de stock bajo ───────────────────────────
create or replace function check_stock_minimo()
returns trigger language plpgsql as $$
begin
  if new.stock <= new.min then
    insert into audit_log (tenant_id, evento, detalle, created_at) values (
      new.tenant_id,
      'stock_bajo_minimo',
      json_build_object('item_id', new.id, 'nombre', new.nom, 'stock', new.stock, 'min', new.min)::text,
      now()
    );
  end if;
  return new;
end;
$$;

create trigger trg_stock_minimo
  after update of stock on inventario
  for each row when (new.stock <= new.min)
  execute function check_stock_minimo();
