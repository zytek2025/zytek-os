# CHECKPOINT - Sub-bloque A.1 - FinTrack base

**Fecha de cierre:** 19 abril 2026
**Estado:** CERRADO - aplicado en DB y verificado (11/11 queries pasan)
**Commit:** feat(fintrack): sub-bloque A.1 - capa base de tesoreria

---

## Archivos del sub-bloque

| Archivo | Estado |
|---|---|
| supabase/migrations/026_fintrack_base.sql | Creado. Contiene ajuste de INSERT a pos_audit_trace con columnas reales (entity_type, entity_id, data_after, reason). Corrupto de encoding - regenerar. |
| scripts/verify_fintrack_migration.sql | Creado. 11 queries, caso 9 usa zytek_users.nombre (no full_name). |
| src/lib/fintrack/types.ts | Creado. Tipos literales del briefing. |
| src/lib/fintrack/service.ts | Creado. Import ajustado a @/lib/supabase.client. Type-check pasa sin errores nuevos. |
| docs/qa/A1_fintrack_tests.md | Creado. 5 casos de prueba manual con ajustes de columnas reales. |
| TODO-v2.md | Creado. Normalizaciones diferidas de pos_orders y pos_audit_trace. |
| docs/BLOQUE_A_cobro_fintrack.md | Briefing maestro commiteado. |

---

## Verificacion en DB real - 11/11 queries OK

| Query | Esperado | Resultado |
|---|---|---|
| Q1 | 8 tablas fintrack_* | 8 tablas listadas |
| Q2 | 7 monedas | total = 7 |
| Q3 | 9 formas de pago | total = 9 |
| Q4 | 2 filas (USD principal, VES) | USD true, VES false |
| Q5 | 7 formas activas del tenant | 7 filas (efectivo, tarjeta_pos, transferencia, pago_movil, biopago, zelle, credito_cliente) |
| Q6 | 4 cuentas saldo 0 | Caja Bs, Caja USD, BDV empresa, Zelle empresa - todas con 0.00 |
| Q7 | 7 vinculos N:M | OK (BDV con 4 formas, Caja USD con efectivo default, etc) |
| Q8 | funcion aplicar_movimiento existe | 1 fila |
| Q9 | aplicar apertura $50 a Caja USD | NOTICE con UUID |
| Q10 | saldo Caja USD = 50.00 | 50.00 |
| Q11 | movimiento registrado en libro | apertura, 50.00, USD, 0.00, 50.00 |

---

## Discrepancias schema doc vs DB real

Durante A.1 se descubrieron diferencias entre zytekos_schema_maestro.sql y la DB real aplicada:

| Asumido en briefing | Realidad en DB | Ajuste aplicado |
|---|---|---|
| zytek_users.full_name | zytek_users.nombre | Corregido en verify script caso Q9 |
| pos_audit_trace.severity, target_type, target_id, metadata | entity_type, entity_id, data_after, reason | Corregido INSERT en fintrack_aplicar_movimiento |
| Import @/lib/supabase/client (carpeta) | @/lib/supabase.client (archivo con punto) | Ajustado en service.ts |
| createClient() por servicio | Singleton supabase ya exportado | Ajustado en service.ts |

Verificacion del schema real se hizo con script temporal (scripts/inspect-pos-audit-trace.mjs, borrado) usando service role + dotenv.

---

## Problema de encoding con Supabase Studio

Durante la aplicacion del SQL se descubrio que el archivo 026_fintrack_base.sql tiene encoding corrupto (caracteres Unicode mal codificados al ser escrito desde Windows). No rompe funcionalidad porque Supabase Studio usa UTF-8, pero el archivo es ilegible con caracteres raros tipo A-circular, A-punto-medio.

El SQL se aplico con exito usando archivos divididos en ASCII puro:

- 026a_tablas.sql (tablas + indices + seeds de catalogo)
- 026b1_solo_aplicar_movimiento.sql (funcion CORE con variables locales)
- 026b2_solo_cuentas_por_fp.sql (helper para UI)
- 026b3_solo_recalcular_saldo.sql (auditoria)
- 026c1_funcion_seed_ascii.sql (funcion de seed)
- 026c2_ejecutar_seed.sql (llama seed + tasas iniciales)
- 026c3_rls.sql (RLS y policies)

**TODO-v2:** regenerar 026_fintrack_base.sql consolidando las partes con encoding UTF-8 correcto para que el archivo del repo sea legible y reproducible.

---

## Descubrimiento clave - Supabase Studio y variables locales

El SQL Editor web de Supabase tiene un validador que confunde variables locales de PL/pgSQL (ej: v_cuenta fintrack_cuentas%rowtype) con declaraciones de tablas nuevas. Dispara un popup de "New table will not have RLS enabled" cuando detecta una variable local.

**Solucion:** al aparecer el popup, usar "Run without RLS" (el boton naranja). No es inseguro - las variables locales no son tablas reales.

Este patron se debe recordar para A.2 (PaymentService genera SQL similar con variables locales).

---

## Proximos pasos

1. **A.1 cerrado** - listo para avanzar.
2. **A.2 - Flujo de cobro** es lo siguiente. Bloqueado hasta que Daniel decida como tratar pos_orders (el briefing asume estado espanol pero el codigo vivo usa status ingles). Decision pendiente: hacer SELECT de information_schema.columns previo a codificar.
3. **A.3 - Fix de boton Enviar** puede ejecutarse independiente una vez A.2 este hecho o en paralelo.

---

## Regla de disciplina aplicada

Sub-bloque A.1 cerrado solo cuando:
- Migracion aplicada en DB real
- 11 queries de verificacion pasan
- Commit final hecho
- Daniel confirma explicitamente el cierre

Todos los checkmarks cumplidos. A.1 esta oficialmente cerrado. Se puede avanzar a A.2 cuando Daniel decida.
