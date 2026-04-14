# ZytekOS — Security Walkthrough

## 1. Verificar que JWT_SECRET esté configurado

```bash
# En .env.local debe existir:
NEXTAUTH_SECRET=zytek_super_secret_change_in_production_2025

# Generar uno seguro:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Si falta, `/api/auth` retorna 500 con "Error de configuración del servidor".

---

## 2. Test de login — bcrypt hash vs plano

```bash
# Test 1: PIN correcto → debe retornar token
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"pin":"1369","tenantId":"00000000-0000-0000-0000-000000000001"}'
# Esperado: {"ok":true,"user":{...},"token":"eyJ..."}

# Test 2: PIN incorrecto → 401
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"pin":"0000","tenantId":"00000000-0000-0000-0000-000000000001"}'
# Esperado: {"ok":false,"error":"PIN incorrecto"}

# Test 3: Rate limiting — 11 intentos rápidos → 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth \
    -H "Content-Type: application/json" \
    -d '{"pin":"wrong","tenantId":"test"}'
done
# Primeros 10: 401, el 11: 429
```

---

## 3. Test de licencias

```bash
# Test 1: Clave válida
curl -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d '{"key":"ZYTEK-DEMO-PRO-2025"}'
# Esperado: {"ok":true,"license":{...}}

# Test 2: Clave inválida → 401
curl -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d '{"key":"ZYTEK-FAKE-0000-0000"}'
# Esperado: {"ok":false,"reason":"not_found"}

# Test 3: Módulo no permitido con plan básico
curl -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -d '{"key":"ZYTEK-DEMO-BASIC-2025","moduleId":"admin"}'
# Esperado: {"ok":false,"reason":"module_not_allowed"}
```

---

## 4. Test de rutas protegidas

```bash
# Sin token → 401
curl http://localhost:3000/api/ventas
# Esperado: {"ok":false,"error":"Token requerido"}

# Con token válido → 200
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"pin":"1369","tenantId":"00000000-0000-0000-0000-000000000001"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl http://localhost:3000/api/ventas \
  -H "Authorization: Bearer $TOKEN"
# Esperado: {"ok":true,"data":[...]}
```

---

## 5. Verificar que F12 no expone lógica crítica

1. Abre http://localhost:3000 en el browser
2. F12 → Sources
3. Verifica que NO ves:
   - `NEXTAUTH_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Lógica de validación de licencias
   - Hashes de PINs de producción

4. Lo que SÍ ves (normal — es público):
   - Claves demo (`ZYTEK-DEMO-*`) en `LicenseGate.tsx` — son de prueba, no importa
   - `NEXT_PUBLIC_SUPABASE_URL` — normal, es la URL pública
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — normal, es la clave de solo lectura

---

## 6. Verificar row versioning en sync

```javascript
// En la consola del browser (módulo POS abierto):
// Encolar una operación y verificar que tiene updated_at
const { _IDB, _Sync } = window;
await _Sync.enqueue('pos', 'test_table', 'upsert', { id: 'test', valor: 123 });
const queue = await _IDB.getAll('sync_queue');
console.log(queue[queue.length-1].data);
// Esperado: { id: 'test', valor: 123, updated_at: '2025-...', _client_ts: 1234567890 }
```

---

## 7. PINs para testing

| Usuario   | PIN  | Nivel | Rol            |
|-----------|------|-------|----------------|
| Daniel F. | 1369 | 1     | Super Admin    |
| Admin     | 2580 | 2     | Administrador  |
| Cajero    | 1234 | 4     | Cajero         |
| Mesero 1  | 5678 | 5     | Mesero         |

---

## 8. Generar hash bcrypt para nuevo usuario

```bash
node -e "
const bcrypt = require('bcryptjs');
const pin = process.argv[1];
const hash = bcrypt.hashSync(pin, 10);
console.log('PIN:', pin);
console.log('Hash:', hash);
console.log('SQL: UPDATE zytek_users SET pin_hash = \''+hash+'\' WHERE nombre = \'...\';');
" 9999
```
