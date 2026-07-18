import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { fetchGoogleEventsForDay } from '@/lib/google'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return ERR.invalidInput('Datum nije validan')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.googleEvents
  if (!(await checkRateLimit(supabase, 'google-events', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const res = await fetchGoogleEventsForDay(supabase, user.id, date)

  // `connected` govori klijentu stanje veze — bez toga "nema događaja" i
  // "veza je pukla" izgledaju isto, pa app ćuti kad prestane da radi.
  switch (res.status) {
    case 'ok': return apiOk({ events: res.events, connected: true })
    case 'disconnected': return apiOk({ events: [], connected: false })
    case 'needsReconnect': return apiOk({ events: [], connected: false, needsReconnect: true })
    case 'degraded': return apiOk({ events: [], degraded: true })
  }
}
