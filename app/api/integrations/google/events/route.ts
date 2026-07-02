import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile?.google_refresh_token) return apiOk({ events: [] })

  let accessToken = profile.google_access_token
  const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (needsRefresh) {
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (!refreshed) return apiOk({ events: [] })
    accessToken = refreshed.access_token
    await supabase.from('profiles').update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: refreshed.expires_at,
    }).eq('id', user.id)
  }

  const timeMin = `${date}T00:00:00Z`
  const timeMax = `${date}T23:59:59Z`
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!calRes.ok) return apiOk({ events: [] })

  const calData = await calRes.json()
  const events = (calData.items ?? []).map((e: Record<string, unknown>) => {
    const start = e.start as Record<string, string>
    const end = e.end as Record<string, string>
    return {
      id: e.id as string,
      title: (e.summary as string) ?? 'Bez naziva',
      time: start.dateTime ? start.dateTime.slice(11, 16) : null,
      endTime: end?.dateTime ? end.dateTime.slice(11, 16) : null,
      allDay: !!start.date,
    }
  }).filter((e: { allDay: boolean }) => !e.allDay)

  return apiOk({ events })
}
