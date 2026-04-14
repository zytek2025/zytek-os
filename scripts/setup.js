#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  ZytekOS Setup Script
//  Corre con: node scripts/setup.js
//  Hace: copia los HTML modules, verifica .env, crea directorios
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs')
const path = require('path')

const ROOT    = path.resolve(__dirname, '..')
const MODULES = path.join(ROOT, 'public', 'modules')
const ENV     = path.join(ROOT, '.env.local')

console.log('\n╔══════════════════════════════════════════╗')
console.log('║  ZytekOS — Setup                         ║')
console.log('╚══════════════════════════════════════════╝\n')

// 1. Verificar .env.local
if (!fs.existsSync(ENV)) {
  console.log('⚠️  .env.local no encontrado')
  console.log('   Copia .env.example a .env.local y llena los valores\n')
  fs.copyFileSync(path.join(ROOT, '.env.example'), ENV)
  console.log('✅ .env.local creado desde .env.example\n')
} else {
  console.log('✅ .env.local encontrado')
}

// 2. Crear directorio public/modules
if (!fs.existsSync(MODULES)) {
  fs.mkdirSync(MODULES, { recursive: true })
}

// 3. Verificar HTML modules
const REQUIRED_MODULES = [
  'zytek-core.js',
  'zytek-pos-restaurant.html',
  'zytek-admin.html',
  'zytek-pos-mesero.html',
  'zytek-kds.html',
  'zytek-pos-retail.html',
  'zytek-module-crm.html',
  'zytek-agente-constructor.html',
]

console.log('\n📦 Verificando módulos HTML en public/modules/:')
let missing = 0
for (const f of REQUIRED_MODULES) {
  const exists = fs.existsSync(path.join(MODULES, f))
  console.log(`  ${exists ? '✅' : '❌'} ${f}`)
  if (!exists) missing++
}

if (missing > 0) {
  console.log(`\n⚠️  Faltan ${missing} archivos en public/modules/`)
  console.log('   Copia los archivos HTML descargados de ZytekOS a esa carpeta\n')
} else {
  console.log('\n✅ Todos los módulos HTML encontrados')
}

// 4. Verificar node_modules
const NM = path.join(ROOT, 'node_modules')
if (!fs.existsSync(NM)) {
  console.log('\n📦 node_modules no encontrado — corre: npm install\n')
} else {
  console.log('✅ node_modules encontrado')
}

console.log('\n─────────────────────────────────────────')
console.log('PRÓXIMOS PASOS:')
console.log('')
console.log('  1. npm install')
console.log('  2. Copia los .html a public/modules/')
console.log('  3. Configura .env.local con tus keys')
console.log('')
console.log('  DESARROLLO:')
console.log('  npm run dev              → localhost:3000 (hot reload)')
console.log('  npm run db:start         → Supabase local en :54321')
console.log('')
console.log('  DOCKER (todo junto):')
console.log('  npm run docker:dev       → DB + Redis (tú corres npm run dev aparte)')
console.log('  npm run docker:prod      → App + DB + Redis completo')
console.log('')
console.log('  SUPABASE LOCAL:')
console.log('  npx supabase init        → inicializar')
console.log('  npx supabase start       → levantar postgres + realtime + studio')
console.log('  npx supabase db reset    → aplicar migraciones')
console.log('─────────────────────────────────────────\n')
