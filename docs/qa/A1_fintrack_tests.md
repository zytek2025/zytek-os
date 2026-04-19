# QA · Bloque A.1 · FinTrack base

## Pre-condiciones

- Migración `026_fintrack_base.sql` aplicada sin errores en Supabase Studio
- 11 queries de `scripts/verify_fintrack_migration.sql` pasan con resultado esperado

## Casos de prueba manual

### Caso 1 · Listar cuentas del tenant demo

**Query:**
```sql
select * from fintrack_cuentas
where tenant_id = '00000000-0000-0000-0000-0000000000de';
```
**Esperado:** 4 filas · `Caja Bs`, `Caja USD`, `BDV empresa`, `Zelle empresa`.

---

### Caso 2 · Intentar insertar movimiento con moneda incorrecta

**Query:**
```sql
select fintrack_aplicar_movimiento(
  '00000000-0000-0000-0000-0000000000de',
  (select id from fintrack_cuentas
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Caja USD' limit 1),
  'ingreso_venta',
  100.00,
  'VES',
  (select id from zytek_users
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Admin Demo' limit 1)
);
```
**Esperado:** ERROR `Moneda VES no coincide con moneda de la cuenta USD`.

> Nota: la columna real de `zytek_users` es `nombre`, no `full_name` (el
> briefing original tenía este dato inexacto).

---

### Caso 3 · Validar que `saldo_despues` se calcula correctamente

Ingresar $10 a `Caja USD` (partiendo del saldo actual) y verificar que
`saldo_actual` de la cuenta incrementa en 10 y que el movimiento registra
`saldo_antes` y `saldo_despues` coherentes.

```sql
-- Saldo antes
select saldo_actual from fintrack_cuentas
where tenant_id = '00000000-0000-0000-0000-0000000000de'
  and nombre = 'Caja USD';

-- Aplicar +10
select fintrack_aplicar_movimiento(
  '00000000-0000-0000-0000-0000000000de',
  (select id from fintrack_cuentas
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Caja USD' limit 1),
  'ingreso_venta',
  10.00,
  'USD',
  (select id from zytek_users
    where tenant_id = '00000000-0000-0000-0000-0000000000de'
      and nombre = 'Admin Demo' limit 1),
  null, null, 'efectivo', null, 'Test caso 3'
);

-- Saldo después (debe ser previo + 10)
select saldo_actual from fintrack_cuentas
where tenant_id = '00000000-0000-0000-0000-0000000000de'
  and nombre = 'Caja USD';
```

---

### Caso 4 · Verificar tasa USD → VES

**Query:**
```sql
select tasa from fintrack_tasas
where tenant_id = '00000000-0000-0000-0000-0000000000de'
  and moneda_origen = 'USD'
  and moneda_destino = 'VES'
order by fecha desc limit 1;
```
**Esperado:** `36.50`.

---

### Caso 5 · Audit log registra el movimiento

**Query:**
```sql
select count(*) from pos_audit_trace
where action = 'fintrack_movimiento';
```
**Esperado:** mayor a `0` tras haber aplicado los casos 3+.

> Nota: el audit se inserta con columnas reales `entity_type`, `entity_id`,
> `data_after`, `reason` — no `target_type`/`target_id`/`metadata`/`severity`
> (el briefing original asumía columnas que no existen en `pos_audit_trace`).

---

## Resultado

- [ ] Caso 1 pasa
- [ ] Caso 2 pasa
- [ ] Caso 3 pasa
- [ ] Caso 4 pasa
- [ ] Caso 5 pasa

Cuando los 5 casos pasen, marcar A.1 como cerrado y avanzar a A.2.
