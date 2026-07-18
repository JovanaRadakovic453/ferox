import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate, zPriority } from '@/lib/validation'
import { todayKey, toTimezone } from '@/lib/date'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

// Podsetnik najviše 28 dana unapred (40320 min) — realan prozor, ne 99 dana.
const REMIND_MAX_MINUTES = 40320

// `today` = KORISNIKOV današnji dan (po profiles.timezone), ne serverski/Beograd
// — inače provera "nije u prošlosti" uveče odbija današnji datum korisnicima
// zapadno od Beograda.
const createSchema = (today: string) => z.object({
  name: z.string().trim().min(1).max(120),
  priority: zPriority.default('medium'),
  note: z.string().max(500).default(''),
  for_date: zStrictDate.refine(d => d >= today, 'Datum ne može biti u prošlosti'),
  remind_before_minutes: z.number().int().min(1).max(REMIND_MAX_MINUTES).nullable().default(null),
  deadline_date: zStrictDate.nullable().default(null),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return ERR.invalidInput('Parametri from i to su obavezni')

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('for_date', from)
    .lte('for_date', to)
    .eq('done', false)
    .order('for_date')

  if (error) return ERR.server(error.message)
  return apiOk(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.scheduledWrite
  if (!(await checkRateLimit(supabase, 'scheduled-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { data: prof } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle()
  const today = todayKey(toTimezone(prof?.timezone))

  const json = await request.json().catch(() => null)
  const parsed = createSchema(today).safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return ERR.server(error.message)
  return apiOk(data, 201)
}
