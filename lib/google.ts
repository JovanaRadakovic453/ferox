// Čitanje događaja iz Google Kalendara — jedno mesto istine za dve rute
// (prikaz događaja i automatsko uvlačenje u plan dana), da se logika osvežavanja
// tokena i biranja događaja ne duplira.

import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, toTimezone } from '@/lib/date'

export type GoogleEvent = {
  id: string
  title: string
  /** "HH:MM" ako događaj ima vreme; null za celodnevni. */
  time: string | null
  endTime: string | null
  allDay: boolean
}

export type GoogleFetch =
  /** Veza radi — `events` su događaji tog dana (može i prazno). */
  | { status: 'ok'; events: GoogleEvent[] }
  /** Korisnik nije povezan sa Google-om. */
  | { status: 'disconnected' }
  /** Dozvola je opozvana/istekla — veza obrisana, treba se ponovo povezati. */
  | { status: 'needsReconnect' }
  /** Privremen problem (mreža/Google) — tokeni se NE diraju. */
  | { status: 'degraded' }

type RefreshResult =
  | { ok: true; access_token: string; expires_at: string }
  | { ok: false; status: number }

async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  }).catch(() => null)
  if (!res) return { ok: false, status: 0 }
  if (!res.ok) return { ok: false, status: res.status }
  const data = await res.json()
  return {
    ok: true,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

/**
 * Bira događaje koji pripadaju traženom danu.
 *
 * Google daje DVE vrste i obe nas zanimaju:
 *  • sa vremenom → `start.dateTime` u korisnikovoj zoni (timeZone param),
 *    npr. "2026-07-18T09:30:00+02:00" → dan = prvih 10, vreme = 11-16;
 *  • celodnevni → samo `start.date`, BEZ vremena. `end.date` je EKSKLUZIVAN
 *    (jednodnevni 18.07 → start 18.07, end 19.07), pa poredimo opsegom da bi i
 *    višednevni bio vidljiv na svakom svom danu.
 *
 * Izdvojeno i izvezeno da može da se testira bez mreže.
 */
export function pickEventsForDay(items: Record<string, unknown>[], date: string): GoogleEvent[] {
  return items
    .map((e): GoogleEvent | null => {
      const start = e.start as Record<string, string> | undefined
      const end = e.end as Record<string, string> | undefined
      const id = e.id as string
      const title = (e.summary as string) ?? 'Bez naziva'

      if (start?.dateTime) {
        if (start.dateTime.slice(0, 10) !== date) return null
        return {
          id,
          title,
          time: start.dateTime.slice(11, 16),
          endTime: end?.dateTime ? end.dateTime.slice(11, 16) : null,
          allDay: false,
        }
      }

      if (start?.date) {
        const from = start.date
        const to = end?.date
        const inRange = to ? from <= date && date < to : from === date
        if (!inRange) return null
        return { id, title, time: null, endTime: null, allDay: true }
      }

      return null
    })
    .filter((e): e is GoogleEvent => e !== null)
}

/**
 * Šta od događaja tek treba uvući u plan. Uvlačenje se pokreće pri SVAKOM
 * otvaranju plana, pa filtriramo tri stvari:
 *  • već uvučeno — po `google_event_id`;
 *  • već ručno uneto — po imenu (razmaci/velika slova nebitni), da se ne udvoji
 *    ono što je korisnik sam otkucao;
 *  • sklonjeno (✕) — da se ne vraća.
 *
 * Izdvojeno i izvezeno da može da se testira bez baze.
 */
export function eventsToImport(
  events: GoogleEvent[],
  existing: { name: string; google_event_id?: string | null }[],
  dismissedIds: string[] = [],
): GoogleEvent[] {
  const norm = (s: string) => s.trim().toLowerCase()
  const knownIds = new Set(existing.map(r => r.google_event_id).filter((v): v is string => !!v))
  const knownNames = new Set(existing.map(r => norm(r.name)))
  const dismissed = new Set(dismissedIds)
  return events.filter(e =>
    !dismissed.has(e.id) && !knownIds.has(e.id) && !knownNames.has(norm(e.title)))
}

/**
 * Dohvata događaje korisnika za jedan dan. Osvežava access token po potrebi i,
 * ako je dozvola opozvana, čisti vezu (pa UI može da traži ponovno povezivanje).
 */
export async function fetchGoogleEventsForDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<GoogleFetch> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, timezone')
    .eq('id', userId)
    .single()

  if (!profile?.google_refresh_token) return { status: 'disconnected' }

  let accessToken = profile.google_access_token
  const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (needsRefresh) {
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (!refreshed.ok) {
      // 400/401 = refresh token opozvan/istekao → očisti vezu i traži ponovno povezivanje.
      if (refreshed.status === 400 || refreshed.status === 401) {
        console.error('google: refresh token nevažeći, brišem vezu', userId)
        await supabase.from('profiles').update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        }).eq('id', userId)
        return { status: 'needsReconnect' }
      }
      // Tranzijentna greška (mreža/5xx) — NE diramo tokene.
      console.error('google: refresh nije uspeo (tranzijentno)', userId, refreshed.status)
      return { status: 'degraded' }
    }
    accessToken = refreshed.access_token
    await supabase.from('profiles').update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: refreshed.expires_at,
    }).eq('id', userId)
  }

  // "Dan" je dan KORISNIKA, ne UTC dan: prozor širimo za dan sa obe strane
  // (pokriva svaku zonu), tražimo vremena u korisnikovoj zoni (timeZone), pa
  // zadržimo samo one čiji je lokalni datum baš traženi. Sa UTC granicama je
  // termin u 00:30 upadao u pogrešan dan.
  const params = new URLSearchParams({
    timeMin: `${addDays(date, -1)}T00:00:00Z`,
    timeMax: `${addDays(date, 1)}T23:59:59Z`,
    timeZone: toTimezone(profile.timezone),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!calRes.ok) {
    console.error('google: calendar API greška', userId, calRes.status)
    return { status: 'degraded' }
  }

  const calData = await calRes.json()
  return { status: 'ok', events: pickEventsForDay((calData.items ?? []) as Record<string, unknown>[], date) }
}
