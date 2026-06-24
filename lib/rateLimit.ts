import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Per-korisnik rate limit sa fiksnim prozorom, oslonjen na Postgres funkciju
 * `rate_limit_hit` (atomično preko UPSERT-a, RLS-bezbedno preko auth.uid()).
 * Vraća `true` ako je zahtev DOZVOLJEN.
 *
 * Fail-OPEN: ako sam mehanizam za rate limit padne (DB greška), puštamo zahtev
 * i logujemo — tranzijentni problem ne sme da obori osnovnu funkcionalnost.
 * (Anthropic org-level spend limit ostaje krajnja zaštita troška.)
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  route: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('rate_limit_hit', {
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSec,
  })
  if (error) {
    console.error('rate_limit_hit error', route, error.message)
    return true // fail open
  }
  return data !== false
}
