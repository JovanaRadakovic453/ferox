import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanScreen from '@/components/plan/PlanScreen'
import { todayKey, tomorrowKey, isValidDayKey, addDays, toTimezone } from '@/lib/date'
import { computeStreak } from '@/lib/streak'
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
    supabase.from('appointments').select('*').eq('user_id', user.id).eq('date_key', viewDate).order('time'),
    supabase.from('day_entries').select('id').eq('user_id', user.id).eq('date_key', tomorrowKey(tz)).maybeSingle(),
    supabase.from('day_entries').select('date_key').eq('user_id', user.id).not('finished_at', 'is', null).order('date_key', { ascending: false }).limit(60),
    isToday
      ? supabase.from('scheduled_tasks').select('id, for_date, remind_before_minutes').eq('user_id', user.id).eq('done', false).not('remind_before_minutes', 'is', null).gt('for_date', today).lte('for_date', addDays(today, 99))
      : Promise.resolve({ data: [] }),
    isToday
      ? supabase.from('scheduled_tasks').select('name, deadline_date').eq('user_id', user.id).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', today).order('deadline_date')
      : Promise.resolve({ data: [] }),
  ])

  const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSet, profile?.rest_days ?? [0, 6], today)

  return (
    <PlanScreen
      entry={entry as DayEntry}
      tasks={(tasks ?? []) as Task[]}
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
      overdueScheduled={(overdueDeadlines ?? []) as { name: string; deadline_date: string }[]}
    />
  )
}
