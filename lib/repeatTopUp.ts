// Dopuna horizonta za zadatke koji se ponavljaju.
//
// Pojavljivanja se prave unapred kao obični redovi u `scheduled_tasks`, pa se
// horizont s vremenom istroši. Bez dopune bi serija posle ~4 meseca TIHO prestala
// da se pojavljuje — greška koja se ne prijavi nigde. Zato ovo vrti isti satni
// budilnik koji šalje jutarnje podsetnike (app/api/cron/reminders).
//
// Radi u koracima od po jednog pravila i preskače ono što je već dopunjeno, pa je
// jeftino i kad korisnika ima mnogo.

import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, dayKey, toTimezone } from '@/lib/date'
import { repeatOccurrences, type RepeatRule } from '@/lib/repeat'
import { REPEATS } from '@/lib/config'

type RepeatRow = {
  id: string
  user_id: string
  name: string
  priority: string
  note: string
  freq: string
  weekdays: number[] | null
  month_day: number | null
  start_date: string
  end_date: string | null
  generated_through: string | null
}

export async function topUpRepeats(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ rules: number; created: number }> {
  const { data: rules } = await supabase
    .from('task_repeats')
    .select('id, user_id, name, priority, note, freq, weekdays, month_day, start_date, end_date, generated_through')
    .eq('active', true)

  if (!rules?.length) return { rules: 0, created: 0 }

  // Zona po korisniku: "danas" mora biti korisnikov, da se ne dopunjuje dan ranije
  // ili kasnije nego što treba.
  const userIds = [...new Set((rules as RepeatRow[]).map(r => r.user_id))]
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, timezone')
    .in('id', userIds)

  const tzById = new Map((profs ?? []).map(p => [p.id as string, toTimezone(p.timezone)]))

  let touched = 0
  let created = 0

  for (const r of rules as RepeatRow[]) {
    const today = dayKey(now, tzById.get(r.user_id))
    const have = r.generated_through

    // Dopunjuj tek kad se horizont približi kraju — inače bismo svaki sat radili
    // upite ni za šta.
    if (have && have >= addDays(today, REPEATS.topUpWhenLeftDays)) continue

    const rule: RepeatRule = {
      freq: r.freq as RepeatRule['freq'],
      weekdays: r.weekdays ?? [],
      monthDay: r.month_day,
      startDate: r.start_date,
      endDate: r.end_date,
    }

    // Kreni od dana posle poslednjeg napravljenog (ili od danas, ako je zapis prazan).
    const from = have && have >= today ? addDays(have, 1) : today
    const to = addDays(today, REPEATS.horizonDays)
    if (from > to) continue

    const dates = repeatOccurrences(rule, from, to, REPEATS.maxOccurrences)
    touched++

    if (dates.length) {
      const { error } = await supabase.from('scheduled_tasks').insert(
        dates.map(d => ({
          user_id: r.user_id,
          name: r.name,
          priority: r.priority,
          note: r.note,
          for_date: d,
          deadline_date: null,
          repeat_id: r.id,
        }))
      )
      // Ako upis padne, NE pomeramo generated_through — sledeći sat pokušava ponovo.
      if (error) continue
      created += dates.length
    }

    await supabase.from('task_repeats').update({ generated_through: to }).eq('id', r.id)
  }

  return { rules: touched, created }
}
