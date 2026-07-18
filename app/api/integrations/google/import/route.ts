import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'
import { RATE_LIMITS, DEFAULTS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { fetchGoogleEventsForDay } from '@/lib/google'

/**
 * Uvlači Google događaje tog dana u plan kao prave termine — da se odmah broje
 * i mogu da se štikliraju, bez ručnog "Dodaj".
 *
 * Idempotentno: `google_event_id` veže termin za Google događaj, pa ponovno
 * otvaranje ne pravi duplikate. Termin koji je korisnik sklonio (✕) ostaje kao
 * `dismissed` red — zato se NE uvlači ponovo.
 *
 * Uvlače se samo događaji SA VREMENOM; celodnevni nemaju vreme pa ne mogu da
 * budu termin (i dalje se vide u Kalendaru i pri pravljenju plana).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.googleEvents
  if (!(await checkRateLimit(supabase, 'google-events', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const date = (json as { date?: string } | null)?.date
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return ERR.invalidInput('Datum nije validan')

  const res = await fetchGoogleEventsForDay(supabase, user.id, date)
  if (res.status === 'disconnected') return apiOk({ imported: [], connected: false })
  if (res.status === 'needsReconnect') return apiOk({ imported: [], connected: false, needsReconnect: true })
  if (res.status === 'degraded') return apiOk({ imported: [], degraded: true })

  const timed = res.events.filter(e => e.time)
  if (timed.length === 0) return apiOk({ imported: [], connected: true })

  // Šta je za taj dan već povučeno (uključujući sklonjene) — da ne uvlačimo dvaput.
  const { data: existing } = await supabase
    .from('appointments')
    .select('google_event_id')
    .eq('user_id', user.id)
    .eq('date_key', date)
    .not('google_event_id', 'is', null)

  const known = new Set((existing ?? []).map(r => r.google_event_id as string))
  const missing = timed.filter(e => !known.has(e.id))
  if (missing.length === 0) return apiOk({ imported: [], connected: true })

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert(missing.map(e => ({
      user_id: user.id,
      date_key: date,
      name: e.title,
      time: e.time as string,
      end_time: e.endTime,
      reminder: DEFAULTS.reminderMinutes,
      done: false,
      google_event_id: e.id,
    })))
    .select('id, name, time, end_time, reminder, done, google_event_id')

  if (error) return ERR.server(error.message)
  return apiOk({ imported: inserted ?? [], connected: true }, 201)
}
