import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanScreen from '@/components/plan/PlanScreen'
import { todayKey, tomorrowKey, isValidDayKey, addDays, toTimezone } from '@/lib/date'
import { computeStreak } from '@/lib/streak'
import { scheduledOnDay, overdueScheduled } from '@/lib/schedule'
import type { Task, Appointment, DayEntry, UserProfile } from '@/types/ferox'

export const dynamic = 'force-dynamic'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  // Profil prvo — treba nam zona da bi "danas" bilo tačno za korisnika,
  // a "danas" određuje koji dan učitavamo. Bez toga bi se datum upisa i čitanja
  // razišli i bacilo bi na praznu početnu.
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const tz = toTimezone(profile?.timezone)
  const today = todayKey(tz)
  const hasDateParam = !!params.date && isValidDayKey(params.date)
  const viewDate = hasDateParam ? params.date! : today
  const isToday = viewDate === today

  const { data: entry } = await supabase.from('day_entries').select('*').eq('user_id', user.id).eq('date_key', viewDate).single()

  if (!entry) redirect('/')

  // finished_at je izvor istine da je dan završen (više se ne oslanjamo na cookie).
  const dayFinished = !!entry.finished_at

  const [{ data: tasks }, { data: appointments }, { data: tomorrowEntry }, { data: finishedRows }, { data: tomorrowScheduled }, { data: overdueDeadlines }] = await Promise.all([
    supabase.from('tasks').select('*').eq('entry_id', entry.id).order('position'),
    // `dismissed` termini su "nadgrobni" redovi sklonjenih Google događaja —
    // postoje samo da se ne uvuku ponovo, i nikad se ne prikazuju.
    supabase.from('appointments').select('*').eq('user_id', user.id).eq('date_key', viewDate).eq('dismissed', false).order('time'),
    supabase.from('day_entries').select('id').eq('user_id', user.id).eq('date_key', tomorrowKey(tz)).maybeSingle(),
    supabase.from('day_entries').select('date_key').eq('user_id', user.id).not('finished_at', 'is', null).order('date_key', { ascending: false }).limit(60),
    isToday
      ? supabase.from('scheduled_tasks').select('id, for_date, remind_before_minutes').eq('user_id', user.id).eq('done', false).not('remind_before_minutes', 'is', null).gt('for_date', today).lte('for_date', addDays(today, 99))
      : Promise.resolve({ data: [] }),
    isToday
      ? supabase.from('scheduled_tasks').select('id, name, deadline_date').eq('user_id', user.id).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', today).order('deadline_date')
      : Promise.resolve({ data: [] }),
  ])

  const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSet, profile?.rest_days ?? [0, 6], today)

  // Zakazani zadaci koji su POČELI a nisu završeni ulaze u plan sami — i to pri
  // SVAKOM otvaranju dana, ne samo kad se plan pravi.
  //
  // Bez ovoga: zadatak zakazan pošto je plan već napravljen nikad ne uđe (tiho se
  // izgubi), a projekat koji traje više dana ne bi se vratio sutra.
  //
  // Serije koje se ponavljaju važe samo za svoj dan (propušten utorak se ne gomila),
  // pa ulaze samo ako je `for_date` baš taj dan.
  const dayTasks = [...((tasks ?? []) as Task[])]
  if (!dayFinished) {
    const { data: openScheduled } = await supabase
      .from('scheduled_tasks')
      .select('id, name, priority, type, note, deadline_date, for_date, repeat_id')
      .eq('user_id', user.id)
      .lte('for_date', viewDate)
      .eq('done', false)

    const alreadyIn = new Set(dayTasks.map(t => t.scheduled_id).filter(Boolean))
    const normalAdd = scheduledOnDay(openScheduled ?? [], viewDate).filter(s => !alreadyIn.has(s.id))
    const normalIds = new Set(normalAdd.map(s => s.id))
    // Promašeni (bez roka, dan prošao) — da ne nestanu tiho, ulaze u DANAŠNJI plan
    // sa svojim danom kao „rokom", pa izbiju na vrh sa crvenom oznakom „Rok prošao".
    const overdueAdd = (isToday ? overdueScheduled(openScheduled ?? [], today) : [])
      .filter(s => !alreadyIn.has(s.id) && !normalIds.has(s.id))

    // Par (zadatak, rok koji upisujemo): promašenima dan postaje rok, ostalima ostaje njihov.
    const toAdd = [
      ...normalAdd.map(s => ({ s, deadline: s.deadline_date ?? null })),
      ...overdueAdd.map(s => ({ s, deadline: s.deadline_date ?? s.for_date })),
    ]

    if (toAdd.length > 0) {
      const { data: addedRows } = await supabase.from('tasks').insert(
        toAdd.map(({ s, deadline }, i) => ({
          entry_id: entry.id,
          user_id: user.id,
          name: s.name,
          priority: s.priority,
          type: s.type ?? 'light',
          note: s.note ?? '',
          done: false,
          position: dayTasks.length + i,
          deadline_date: deadline,
          scheduled_id: s.id,
        }))
      ).select('*')
      dayTasks.push(...((addedRows ?? []) as Task[]))
    }
  }

  // Rok-upozorenje pominje SAMO zakazane koji NISU u planu — one koje smo upravo
  // uvukli (promašene i one sa rokom danas) pokriva već njihova kartica, pa bi
  // inače bili navedeni dvaput.
  const linkedScheduledIds = new Set(dayTasks.map(t => t.scheduled_id).filter(Boolean))
  const overdueWarnings = ((overdueDeadlines ?? []) as { id: string; name: string; deadline_date: string }[])
    .filter(o => !linkedScheduledIds.has(o.id))
    .map(o => ({ name: o.name, deadline_date: o.deadline_date }))

  return (
    <PlanScreen
      entry={entry as DayEntry}
      tasks={dayTasks}
      appointments={(appointments ?? []) as Appointment[]}
      profile={profile as UserProfile}
      dayFinished={dayFinished}
      tomorrowPlanned={!!tomorrowEntry}
      isToday={isToday}
      hasDateParam={hasDateParam}
      streak={streak}
      tomorrowScheduledCount={(tomorrowScheduled ?? []).filter((t: { for_date: string; remind_before_minutes: number }) => {
          const days = Math.ceil(t.remind_before_minutes / 1440)
          return addDays(today, days) === t.for_date
        }).length}
      overdueScheduled={overdueWarnings}
    />
  )
}
