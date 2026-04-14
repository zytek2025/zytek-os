import { createClient } from '@supabase/supabase-js'

// ── Server-side Supabase client ───────────────────────────────
// Usa SERVICE_ROLE_KEY — acceso total, nunca al cliente
// Solo se usa en API Routes y Server Components
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Singleton para reutilizar en la misma request
let _serverClient: ReturnType<typeof createServerClient> | null = null
export function getServerClient() {
  if (!_serverClient) _serverClient = createServerClient()
  return _serverClient
}
