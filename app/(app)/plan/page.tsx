import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanScreen from '@/components/plan/PlanScreen'
import { todayKey, tomorrowKey, isValidDayKey } from '@/lib/date'
import type { Task, Appointment, DayEntry, UserProfile } from '@/types/ferox'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const today = todayKey()
  // Učitavamo plan tačno za traženi datum (default: danas). Time se datum
  // upisa i datum čitanja uvek poklapaju — nema bacanja na praznu početnu.
  const viewDate = isValidDayKey(params.date) ? params.date : today
  const isToday = viewDate === today

  const [{ data: profile }, { data: entry }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('day_entries').select('*').eq('user_id', user.id).eq('date_key', viewDate).single(),
  ])

  if (!entry) redirect('/')

  // finished_at je izvor istine da je dan završen (više se ne oslanjamo na cookie).
  const dayFinished = !!entry.finished_at

  const [{ data: tasks }, { data: appointments }, { data: tomorrowEntry }] = await Promise.all([
    supabase.from('tasks').select('*').eq('entry_id', entry.id).order('position'),
    supabase.from('appointments').select('*').eq('user_id', user.id).eq('date_key', viewDate).order('time'),
    supabase.from('day_entries').select('id').eq('user_id', user.id).eq('date_key', tomorrowKey()).maybeSingle(),
  ])

  return (
    <PlanScreen
      entry={entry as DayEntry}
      tasks={(tasks ?? []) as Task[]}
      appointments={(appointments ?? []) as Appointment[]}
      profile={profile as UserProfile}
      dayFinished={dayFinished}
      tomorrowPlanned={!!tomorrowEntry}
      isToday={isToday}
    />
  )
}
