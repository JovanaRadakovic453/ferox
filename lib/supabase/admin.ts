import { createClient } from '@supabase/supabase-js'

// Service-role client (server-only). Bypasses RLS — use ONLY for privileged ops
// like account deletion. Returns null if the service key isn't configured.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
