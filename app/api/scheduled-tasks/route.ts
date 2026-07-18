import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate, zPriority } from '@/lib/validation'
import { todayKey, toTimezone, addDays } from '@/lib/date'
import { RATE_LIMITS, REPEATS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { REPEAT_FREQS, repeatOccurrences, weekdayOf, type RepeatRule } from '@/lib/repeat'

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
  // Ponavljanje: "svakog utorka" = izaberi utorak + freq 'weekly'. Dan u nedelji i
  // dan u mesecu se IZVODE iz for_date, pa korisnik ne bira dvaput istu stvar.
  // `until` je opciono: prazno = ponavlja se bez kraja. Sa datumom pokriva
  // "radim pomalo svaki dan do roka" — serija stane sama, bez ručnog brisanja.
  repeat: z.object({
    freq: z.enum(REPEAT_FREQS),
    until: zStrictDate.nullable().default(null),
  }).nullable().default(null),
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

  const { repeat, ...task } = parsed.data

  if (!repeat) {
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert({ user_id: user.id, ...task })
      .select()
      .single()

    if (error) return ERR.server(error.message)
    return apiOk(data, 201)
  }

  // --- Zadatak koji se ponavlja ---------------------------------------------
  // Pravilo se čuva zbog kasnijeg zaustavljanja i dopune horizonta, a odmah se
  // prave i sva pojavljivanja kao OBIČNI zakazani zadaci (repeat_id ih veže za
  // pravilo). Zato kalendar, plan dana i podsetnici rade bez izmene.
  if (repeat.until && repeat.until < task.for_date) {
    return ERR.invalidInput('Kraj ponavljanja ne može biti pre prvog dana')
  }

  const rule: RepeatRule = {
    freq: repeat.freq,
    weekdays: repeat.freq === 'weekly' ? [weekdayOf(task.for_date)] : [],
    monthDay: repeat.freq === 'monthly' ? Number(task.for_date.slice(8, 10)) : null,
    startDate: task.for_date,
    endDate: repeat.until,
  }

  const horizonEnd = addDays(today, REPEATS.horizonDays)
  const dates = repeatOccurrences(rule, task.for_date, horizonEnd, REPEATS.maxOccurrences)
  if (!dates.length) return ERR.invalidInput('Pravilo ne pravi nijedan datum')

  const { data: ruleRow, error: ruleErr } = await supabase
    .from('task_repeats')
    .insert({
      user_id: user.id,
      name: task.name,
      priority: task.priority,
      note: task.note,
      freq: rule.freq,
      weekdays: rule.weekdays,
      month_day: rule.monthDay,
      start_date: rule.startDate,
      end_date: rule.endDate,
      generated_through: horizonEnd,
    })
    .select('id')
    .single()

  if (ruleErr || !ruleRow) return ERR.server(ruleErr?.message ?? 'Pravilo nije sačuvano')

  // Rok se NE prenosi na ponavljanje: rok je jedan fiksan datum, pa bi sva buduća
  // pojavljivanja odmah bila "probijena". Podsetnik se prenosi — on je relativan.
  const { error: rowsErr } = await supabase.from('scheduled_tasks').insert(
    dates.map(d => ({
      user_id: user.id,
      name: task.name,
      priority: task.priority,
      note: task.note,
      for_date: d,
      remind_before_minutes: task.remind_before_minutes,
      deadline_date: null,
      repeat_id: ruleRow.id,
    }))
  )

  if (rowsErr) {
    // Pravilo bez pojavljivanja je smeće — počisti da ne ostane pola posla.
    await supabase.from('task_repeats').delete().eq('id', ruleRow.id)
    return ERR.server(rowsErr.message)
  }

  return apiOk({ repeated: true, count: dates.length, repeat_id: ruleRow.id }, 201)
}
