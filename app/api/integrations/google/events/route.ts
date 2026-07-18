import { createClient } from '@/lib/supabase/server'
import { addDays, toTimezone } from '@/lib/date'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

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

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return ERR.invalidInput('Datum nije validan')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.googleEvents
  if (!(await checkRateLimit(supabase, 'google-events', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, timezone')
    .eq('id', user.id)
    .single()

  if (!profile?.google_refresh_token) return apiOk({ events: [] })

  let accessToken = profile.google_access_token
  const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (needsRefresh) {
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (!refreshed.ok) {
      // 400/401 = refresh token opozvan/istekao → očisti vezu i reci klijentu da se ponovo poveže.
      if (refreshed.status === 400 || refreshed.status === 401) {
        console.error('google events: refresh token nevažeći, brišem vezu', user.id)
        await supabase.from('profiles').update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        }).eq('id', user.id)
        return apiOk({ events: [], needsReconnect: true })
      }
      // Tranzijentna greška (mreža/5xx) — NE diramo tokene.
      console.error('google events: refresh nije uspeo (tranzijentno)', user.id, refreshed.status)
      return apiOk({ events: [], degraded: true })
    }
    accessToken = refreshed.access_token
    await supabase.from('profiles').update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: refreshed.expires_at,
    }).eq('id', user.id)
  }

  // "Dan" je dan KORISNIKA, ne UTC dan: prozor širimo za dan sa obe strane
  // (pokriva svaku zonu), tražimo od Google-a vremena u korisnikovoj zoni
  // (timeZone param), pa dole zadržimo samo termine čiji lokalni datum je baš
  // traženi. Sa UTC granicama je termin u 00:30 upadao u pogrešan dan.
  const tz = toTimezone(profile.timezone)
  const params = new URLSearchParams({
    timeMin: `${addDays(date, -1)}T00:00:00Z`,
    timeMax: `${addDays(date, 1)}T23:59:59Z`,
    timeZone: tz,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!calRes.ok) {
    console.error('google events: calendar API greška', user.id, calRes.status)
    return apiOk({ events: [], degraded: true })
  }

  const calData = await calRes.json()
  // dateTime je u korisnikovoj zoni (timeZone param gore), npr.
  // "2026-07-18T09:30:00+02:00" → dan = prvih 10, vreme = 11-16.
  // Celodnevni termini nemaju dateTime pa ispadaju već na filteru.
  const events = ((calData.items ?? []) as Record<string, unknown>[])
    .filter(e => {
      const start = e.start as Record<string, string> | undefined
      return !!start?.dateTime && start.dateTime.slice(0, 10) === date
    })
    .map(e => {
      const start = e.start as Record<string, string>
      const end = e.end as Record<string, string> | undefined
      return {
        id: e.id as string,
        title: (e.summary as string) ?? 'Bez naziva',
        time: start.dateTime.slice(11, 16),
        endTime: end?.dateTime ? end.dateTime.slice(11, 16) : null,
      }
    })

  return apiOk({ events })
}
