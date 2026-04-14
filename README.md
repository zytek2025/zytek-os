# ZytekOS v2.0

Suite SaaS ERP by **Zytek LLC** · Next.js 14 + Supabase + Docker

---

## Estructura del proyecto

```
zytek-os/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Shell / Launcher
│   │   ├── layout.tsx            ← Root layout (fonts, CSS global)
│   │   ├── globals.css           ← Design system tokens
│   │   ├── pos/page.tsx          ← Módulo POS
│   │   ├── admin/page.tsx        ← Módulo Admin ERP
│   │   ├── crm/page.tsx          ← Módulo CRM
│   │   ├── kds/page.tsx          ← Módulo KDS
│   │   ├── mesero/page.tsx       ← Módulo Mesero
│   │   ├── retail/page.tsx       ← Módulo POS Retail
│   │   ├── constructor/page.tsx  ← Módulo Constructor IA
│   │   └── api/
│   │       ├── license/route.ts  ← Validación de licencias (SERVIDOR)
│   │       ├── auth/route.ts     ← Login por PIN con BCrypt (SERVIDOR)
│   │       ├── ventas/route.ts   ← Registrar ventas (SERVIDOR)
│   │       ├── corte-z/route.ts  ← Pipeline Corte Z seguro (SERVIDOR)
│   │       ├── inventario/route.ts
│   │       ├── clientes/route.ts
│   │       └── sync/route.ts     ← Sync cola offline→Supabase
│   ├── components/
│   │   ├── shared/
│   │   │   ├── LicenseGate.tsx   ← Pantalla de activación
│   │   │   └── ModuleLauncher.tsx← Menú de módulos
│   │   └── ui/
│   │       └── Flash.tsx         ← Notificaciones toast
│   ├── lib/
│   │   ├── supabase.server.ts    ← Cliente Supabase (service_role — solo servidor)
│   │   ├── supabase.client.ts    ← Cliente Supabase (anon — cliente)
│   │   ├── license.server.ts     ← Lógica de licencias (SERVIDOR)
│   │   ├── auth.server.ts        ← Verificación JWT (SERVIDOR)
│   │   ├── idb.client.ts         ← IndexedDB offline-first (cliente)
│   │   ├── eventbus.client.ts    ← EventBus entre módulos (cliente)
│   │   └── fmt.ts                ← Utilidades de formato
│   ├── hooks/
│   │   ├── useLicense.ts
│   │   └── useAuth.ts
│   └── types/
│       └── index.ts              ← Tipos TypeScript compartidos
├── public/
│   └── modules/                  ← ← ← PONER LOS HTML AQUÍ
│       ├── zytek-core.js
│       ├── zytek-pos-restaurant.html
│       ├── zytek-admin.html
│       └── ... (resto de módulos)
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial.sql       ← Schema completo con todas las tablas
├── docker/
│   ├── docker-compose.yml        ← Producción (app + db + redis)
│   └── docker-compose.dev.yml    ← Desarrollo (solo db + redis)
├── scripts/
│   └── setup.js                  ← Script de configuración inicial
├── Dockerfile
├── .env.local                    ← Variables de entorno (NO al repo)
└── .env.example                  ← Plantilla de variables
```

---

## Instalación rápida

### Opción A — Desarrollo (recomendado para trabajar en el código)

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar setup (verifica archivos, crea .env.local)
node scripts/setup.js

# 3. Copiar módulos HTML a public/modules/
cp /ruta/a/tus/archivos/*.html public/modules/
cp /ruta/a/tus/archivos/zytek-core.js public/modules/

# 4. Levantar solo la base de datos en Docker
npm run docker:dev

# 5. Aplicar migraciones de Supabase
npx supabase db reset
# O directamente con psql:
# psql postgresql://postgres:zytek_local_password@localhost:5432/zytek_os < supabase/migrations/001_initial.sql

# 6. Correr el servidor de desarrollo
npm run dev
# → http://localhost:3000
```

### Opción B — Docker completo (todo en un comando)

```bash
# 1. Copiar módulos HTML
cp /ruta/a/tus/archivos/*.html public/modules/
cp /ruta/a/tus/archivos/zytek-core.js public/modules/

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores reales

# 3. Levantar todo
npm run docker:prod
# → http://localhost:3000

# Parar
npm run docker:down
```

### Opción C — Supabase local completo

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Inicializar (solo primera vez)
npx supabase init

# Levantar Supabase local (Postgres + Auth + Realtime + Studio)
npx supabase start
# → API:    http://localhost:54321
# → Studio: http://localhost:54323

# Aplicar migraciones
npx supabase db reset

# Levantar Next.js
npm run dev
```

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase (local o cloud) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key — va al cliente | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **solo servidor** | ✅ |
| `NEXTAUTH_SECRET` | Secret para JWT de sesiones | ✅ |
| `LICENSE_SECRET_KEY` | HMAC para firmar licencias | ✅ |
| `LICENSE_MASTER_KEY` | Tu clave master (Zytek LLC) | ✅ |
| `ANTHROPIC_API_KEY` | Para el Constructor IA | Opcional |
| `OLLAMA_BASE_URL` | Para Ollama local | Opcional |

---

## Seguridad

- **Licencias validadas en el servidor** — el cliente llama `/api/license`, nunca ejecuta la validación directamente
- **PINs con BCrypt** — almacenados hasheados en Supabase, comparación en el servidor
- **service_role key nunca al cliente** — solo usada en API Routes
- **JWT de sesión** — firmados con HS256, expiran en 12 horas
- **RLS en Supabase** — cada tenant solo ve sus datos
- **Headers de seguridad** — X-Frame-Options, CSP, etc. en next.config.js

---

## Claves de licencia

```
ZYTEK-DEMO-BASIC-2025  → Plan Básico (POS, Mesero, KDS)
ZYTEK-DEMO-PRO-2025    → Plan Pro (+Admin, CRM, Retail)
ZYTEK-DEMO-ENT-2025    → Plan Enterprise (todo)
[LICENSE_MASTER_KEY]   → Acceso total Zytek LLC
```

**Generar clave para nuevo cliente:**
```bash
# En la consola de Node.js
node -e "
  const t = 'REST'; const p = 'PRO1';
  const y = new Date().getFullYear();
  console.log('ZYTEK-'+t.padEnd(4,'X')+'-'+p.padEnd(4,'0')+'-'+y);
"
# → ZYTEK-REST-PRO1-2026
```

---

## Módulos disponibles

| Módulo | Ruta | Plan mínimo |
|---|---|---|
| POS Restaurante | `/pos` | Básico |
| POS Mesero | `/mesero` | Básico |
| KDS Cocina | `/kds` | Básico |
| Admin ERP | `/admin` | Pro |
| CRM | `/crm` | Pro |
| POS Retail | `/retail` | Pro |
| FinTrack | `/fintrack` | Enterprise |
| Constructor IA | `/constructor` | Enterprise |

---

Zytek LLC · dfornerino.usa@gmail.com · zytek.app
