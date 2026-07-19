import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate } from '@/lib/validation'
import { addDays } from '@/lib/date'

const schema = z.object({ dateKey: zStrictDate })

// "Vrati se u plan" — poništava slučajno kliknuto „Završi dan".
//
// Namerno NIJE isto što i /api/day/reset: ovde se ništa ne briše. Zadaci,
// štikliranja, termini i zakazani zadaci ostaju netaknuti — skida se samo
// oznaka da je dan gotov, pa dan opet radi kao i pre klika.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { dateKey } = parsed.data

  const { data: entry } = await supabase
    .from('day_entries')
    .select('id, finished_at')
    .eq('user_id', user.id)
    .eq('date_key', dateKey)
    .maybeSingle()

  if (!entry) return ERR.notFound()
  if (!entry.finished_at) return apiOk({ reopened: false, returned: 0 })

  // 1. Dan se otvara. Rezime ide jer se piše za KONAČNO stanje dana — kad se dan
  //    stvarno završi, napisaće se nanovo za ono kako je dan tada izgledao.
  const { error: upErr } = await supabase
    .from('day_entries')
    .update({ finished_at: null, eod_recap: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', entry.id)
  if (upErr) return ERR.server(upErr.message)

  // 2. Vrati ono što je „Završi dan" gurnuo za sutra — inače bi se nedovršeni
  //    zadaci sutra pojavili kao „iz prethodnog dana" iako se danas i dalje rade.
  //    Prepoznaju se po imenu zadatka koji je JOŠ u današnjem planu; odloženi
  //    ("Odloži za sutra") su sa današnjeg dana obrisani, pa ih ovo ne dira.
  const nextKey = addDays(dateKey, 1)
  const [{ data: dayTasks }, { data: nextTransfer }] = await Promise.all([
    supabase.from('tasks').select('name').eq('user_id', user.id).eq('entry_id', entry.id),
    supabase.from('transferred_tasks').select('tasks').eq('user_id', user.id).eq('for_date', nextKey).maybeSingle(),
  ])

  let returned = 0
  if (nextTransfer) {
    const stillToday = new Set((dayTasks ?? []).map(t => t.name as string))
    const all = (nextTransfer.tasks ?? []) as { name: string }[]
    const kept = all.filter(t => !stillToday.has(t.name))
    returned = all.length - kept.length

    if (returned > 0) {
      await (kept.length > 0
        ? supabase.from('transferred_tasks').update({ tasks: kept }).eq('user_id', user.id).eq('for_date', nextKey)
        : supabase.from('transferred_tasks').delete().eq('user_id', user.id).eq('for_date', nextKey))
    }
  }

  return apiOk({ reopened: true, returned })
}
