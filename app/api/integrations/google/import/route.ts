import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'
import { RATE_LIMITS, DEFAULTS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { fetchGoogleEventsForDay, eventsToImport, type GoogleEvent } from '@/lib/google'

/**
 * Uvlači Google događaje tog dana u plan — da se odmah broje i mogu da se
 * štikliraju, bez ručnog "Dodaj".
 *
 *  • događaj SA VREMENOM → pravi termin (`appointments`, pamti i kraj);
 *  • CELODNEVNI          → običan zadatak (`tasks`) — nema sat, pa ne može biti termin.
 *
 * Idempotentno na tri načina, jer se ruta zove pri svakom otvaranju plana:
 *  1. `google_event_id` veže stavku za događaj → isti događaj se ne uvlači dvaput;
 *  2. poklapanje po imenu → ne duplira ono što je korisnik već sam uneo;
 *  3. sklonjeno (✕) se pamti — termin kao `dismissed` red, zadatak u
 *     `day_entries.google_dismissed` — pa se ne vraća.
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
  if (res.status === 'disconnected') return apiOk({ imported: [], importedTasks: [], connected: false })
  if (res.status === 'needsReconnect') return apiOk({ imported: [], importedTasks: [], connected: false, needsReconnect: true })
  if (res.status === 'degraded') return apiOk({ imported: [], importedTasks: [], degraded: true })

  const [imported, importedTasks] = await Promise.all([
    importAppointments(supabase, user.id, date, res.events.filter(e => e.time)),
    importTasks(supabase, user.id, date, res.events.filter(e => !e.time)),
  ])

  if (imported.error || importedTasks.error) {
    return ERR.server(imported.error ?? importedTasks.error!)
  }
  return apiOk({ imported: imported.rows, importedTasks: importedTasks.rows, connected: true })
}

type Client = Awaited<ReturnType<typeof createClient>>
type Result<T> = { rows: T[]; error?: string }

/** Događaji SA VREMENOM → termini. */
async function importAppointments(
  supabase: Client, userId: string, date: string, timed: GoogleEvent[],
): Promise<Result<Record<string, unknown>>> {
  if (timed.length === 0) return { rows: [] }

  // Svi termini tog dana — i sklonjeni (`dismissed`), jer oni su "nadgrobni"
  // redovi koji baš i služe da se događaj ne uvuče ponovo.
  const { data: existing } = await supabase
    .from('appointments')
    .select('name, google_event_id')
    .eq('user_id', userId)
    .eq('date_key', date)

  const missing = eventsToImport(timed, (existing ?? []) as { name: string; google_event_id: string | null }[])
  if (missing.length === 0) return { rows: [] }

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert(missing.map(e => ({
      user_id: userId,
      date_key: date,
      name: e.title,
      time: e.time as string,
      end_time: e.endTime,
      reminder: DEFAULTS.reminderMinutes,
      done: false,
      google_event_id: e.id,
    })))
    .select('id, name, time, end_time, reminder, done, google_event_id')

  if (error) return { rows: [], error: error.message }
  return { rows: inserted ?? [] }
}

/** CELODNEVNI događaji → obični zadaci tog dana. */
async function importTasks(
  supabase: Client, userId: string, date: string, allDay: GoogleEvent[],
): Promise<Result<Record<string, unknown>>> {
  if (allDay.length === 0) return { rows: [] }

  // Zadaci vise o danu (entry_id) — ako plan za taj dan još nije napravljen,
  // nema gde da se uvuku. Pojaviće se čim se plan napravi.
  const { data: entry } = await supabase
    .from('day_entries')
    .select('id, google_dismissed')
    .eq('user_id', userId)
    .eq('date_key', date)
    .maybeSingle()
  if (!entry) return { rows: [] }

  const { data: existing } = await supabase
    .from('tasks')
    .select('name, position, google_event_id')
    .eq('entry_id', entry.id)

  const rows = (existing ?? []) as { name: string; position: number | null; google_event_id: string | null }[]
  const missing = eventsToImport(allDay, rows, (entry.google_dismissed ?? []) as string[])
  if (missing.length === 0) return { rows: [] }

  // Idu na kraj spiska — korisnikov redosled se ne dira.
  const nextPos = Math.max(0, ...rows.map(r => r.position ?? 0)) + 1

  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert(missing.map((e, i) => ({
      entry_id: entry.id,
      user_id: userId,
      name: e.title,
      done: false,
      priority: 'medium',
      type: 'light',
      note: '',
      position: nextPos + i,
      google_event_id: e.id,
    })))
    .select('id, name, done, priority, type, note, position, google_event_id')

  if (error) return { rows: [], error: error.message }
  return { rows: inserted ?? [] }
}
