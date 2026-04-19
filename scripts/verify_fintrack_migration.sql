-- ═══════════════════════════════════════════════════════════════
-- ZytekOS · FinTrack base · Verificación post-migración
-- Ejecutar las 11 queries después de aplicar 026_fintrack_base.sql
-- ═══════════════════════════════════════════════════════════════

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
select forma_pago_slug, orden
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


-- Verificación 9: Probar aplicar movimiento de apertura ($50 a Caja USD)
-- NOTA: zytek_users usa la columna `nombre`, NO `full_name`.
do $$
declare
  v_cuenta_id uuid;
  v_user_id uuid;
  v_mov_id uuid;
begin
  select id into v_cuenta_id from fintrack_cuentas
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Caja USD' limit 1;

  select id into v_user_id from zytek_users
    where nombre = 'Admin Demo'
      and tenant_id = '00000000-0000-0000-0000-0000000000de'
    limit 1;

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
