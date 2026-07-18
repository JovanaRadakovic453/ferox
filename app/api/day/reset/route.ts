import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate } from '@/lib/validation'
import { scheduledOnDay } from '@/lib/schedule'

const schema = z.object({ dateKey: zStrictDate })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { dateKey } = parsed.data

  const { data: entry } = await supabase
    .from('day_entries').select('id').eq('user_id', user.id).eq('date_key', dateKey).maybeSingle()

  if (entry) {
    await supabase.from('tasks').delete().eq('user_id', user.id).eq('entry_id', entry.id)
    await supabase.from('day_entries').delete().eq('user_id', user.id).eq('id', entry.id)
  }

  // "Obriši sve i počni iznova" znači ČIST STO za taj dan. Ranije je ovde stajalo
  // `update({ done: false })` nad zakazanim zadacima — to ih je vraćalo nazad, pa se
  // posle reseta pojavljivala gomila starih zadataka umesto praznog dana.
  //
  // Zato se sada brišu i zakazani zadaci koji tog dana važe — po ISTOM pravilu po
  // kom se i prikazuju (scheduledOnDay): njegov dan, ili projekat u rasponu do roka.
  const { data: sched } = await supabase
    .from('scheduled_tasks')
    .select('id, for_date, deadline_date, repeat_id')
    .eq('user_id', user.id)
    .lte('for_date', dateKey)
    .eq('done', false)

  const idsForDay = scheduledOnDay(sched ?? [], dateKey).map(s => s.id)

  await Promise.all([
    supabase.from('appointments').delete().eq('user_id', user.id).eq('date_key', dateKey),
    supabase.from('transferred_tasks').delete().eq('user_id', user.id).eq('for_date', dateKey),
    idsForDay.length > 0
      ? supabase.from('scheduled_tasks').delete().eq('user_id', user.id).in('id', idsForDay)
      : Promise.resolve(),
  ])

  return apiOk({ ok: true, removedScheduled: idsForDay.length })
}
