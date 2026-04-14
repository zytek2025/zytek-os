import { createClient } from '@supabase/supabase-js'

// ── Client-side Supabase client ───────────────────────────────
// Usa ANON_KEY — solo operaciones permitidas por RLS
// Se usa en componentes React client-side
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)
