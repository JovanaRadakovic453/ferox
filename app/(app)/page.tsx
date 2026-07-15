import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
import EodLanding from '@/components/plan/EodLanding'
import { todayKey, tomorrowKey } from '@/lib/date'
import { computeStreak } from '@/lib/streak'
import type { UserProfile, Task, Appointment } from '@/types/ferox'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ sutra?: string; edit?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.completed_once) redirect('/onboarding')

  const params = await searchParams
  const isSutra = params.sutra === '1'
  const isEdit = params.edit === '1'

  const targetDate = isSutra ? tomorrowKey() : todayKey()

  const { data: entry } = await supabase
    .from('day_entries')
    .select('id, finished_at, eod_recap')
    .eq('user_id', user.id)
    .eq('date_key', targetDate)
    .maybeSingle()

  // "Planiraj sutra" kad plan za sutra već postoji → otvori taj plan, ne prazan Setup.
  if (isSutra && entry) {
    redirect(`/plan?date=${targetDate}`)
  }

  // Aktivan (nezavršen) današnji plan → idi pravo na /plan.
  if (!isSutra && !isEdit && entry && !entry.finished_at) {
    redirect('/plan')
  }

  // Završen današnji dan → čista "Dan završen" početna (ne baca nazad na /plan).
  if (!isSutra && !isEdit && entry && entry.finished_at) {
    const [{ data: dayTasks }, { data: transferred }, { data: finishedRows }] = await Promise.all([
      supabase.from('tasks').select('done').eq('entry_id', entry.id).eq('user_id', user.id),
      supabase.from('transferred_tasks').select('tasks').eq('user_id', user.id).eq('for_date', tomorrowKey()).maybeSingle(),
      supabase.from('day_entries').select('date_key').eq('user_id', user.id).not('finished_at', 'is', null).order('date_key', { ascending: false }).limit(60),
    ])
    const total = dayTasks?.length ?? 0
    const doneCount = (dayTasks ?? []).filter(t => t.done).length
    const transferredCount = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done).length

    const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
    const streak = computeStreak(finishedSet, profile.rest_days ?? [0, 6], todayKey())
    if (streak > (profile.best_streak ?? 0)) {
      await supabase.from('profiles').update({ best_streak: streak }).eq('id', user.id)
    }

    return (
      <EodLanding
        doneCount={doneCount}
        total={total}
        transferredCount={transferredCount}
        dateKey={targetDate}
        eodRecap={entry.eod_recap}
        streak={streak}
      />
    )
  }

  // Streak za SetupScreen
  const { data: finishedForStreak } = await supabase
    .from('day_entries')
    .select('date_key')
    .eq('user_id', user.id)
    .not('finished_at', 'is', null)
    .order('date_key', { ascending: false })
    .limit(60)
  const finishedSetForStreak = new Set((finishedForStreak ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSetForStreak, profile.rest_days ?? [0, 6], todayKey())

  // Ako vec postoji plan za targetDate, ucitaj te zadatke i izabranu energiju
  // Inace ucitaj prenesene zadatke iz prethodnog dana
  let initialTasks: Task[] = []
  let initialAppointments: Appointment[] = []
  let showTransferBanner = false
  // Zakazani zadaci koji ulaze u ovaj plan — samo se ONI markiraju kao done pri snimanju.
  let scheduledTaskIds: string[] = []

  if (entry) {
    const [{ data: existingTasks }, { data: existingAppts }, { data: pendingScheduled }] = await Promise.all([
      supabase
        .from('tasks')
        .select('name, note, priority, type, done, position')
        .eq('entry_id', entry.id)
        .eq('user_id', user.id)
        .order('position'),
      supabase
        .from('appointments')
        .select('id, name, time, reminder, done')
        .eq('user_id', user.id)
        .eq('date_key', targetDate)
        .order('time'),
      supabase
        .from('scheduled_tasks')
        .select('id, name, priority, type, note')
        .eq('user_id', user.id)
        .eq('for_date', targetDate)
        .eq('done', false),
    ])
    initialTasks = (existingTasks ?? []) as Task[]
    initialAppointments = (existingAppts ?? []) as Appointment[]
    // Zakazan zadatak dodat POSLE kreiranja dana: ubaci ga u editor umesto da se tiho proguta.
    const pending = (pendingScheduled ?? []) as (Task & { id: string })[]
    if (pending.length > 0) {
      initialTasks = [
        ...initialTasks,
        ...pending.map(t => ({ name: t.name, priority: t.priority, type: t.type ?? 'light', note: t.note ?? '', done: false })),
      ]
      scheduledTaskIds = pending.map(t => t.id)
    }
  } else {
    const [{ data: transferred }, { data: scheduledRows }, { data: apptRows }] = await Promise.all([
      supabase
        .from('transferred_tasks')
        .select('tasks')
        .eq('user_id', user.id)
        .eq('for_date', targetDate)
        .maybeSingle(),
      supabase
        .from('scheduled_tasks')
        .select('id, name, priority, type, note')
        .eq('user_id', user.id)
        .eq('for_date', targetDate)
        .eq('done', false),
      // Već sačuvani termini za taj dan (npr. iz brain dump-a) — da se učitaju i prežive.
      supabase
        .from('appointments')
        .select('id, name, time, reminder, done')
        .eq('user_id', user.id)
        .eq('date_key', targetDate)
        .order('time'),
    ])
    initialAppointments = (apptRows ?? []) as Appointment[]
    const filtered = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done)
    const scheduled = (scheduledRows ?? []) as (Task & { id: string })[]
    const scheduledMapped = scheduled.map(t => ({ name: t.name, priority: t.priority, type: t.type ?? 'light', note: t.note ?? '', done: false }))
    initialTasks = filtered
    scheduledTaskIds = scheduled.map(t => t.id)
    showTransferBanner = filtered.length > 0 || scheduledMapped.length > 0
    return (
      <SetupScreen
        profile={profile as UserProfile}
        targetDate={targetDate}
        transferredTasks={initialTasks}
        scheduledSuggestions={scheduledMapped}
        initialAppointments={initialAppointments}
        showTransferBanner={showTransferBanner}
        scheduledTaskIds={scheduledTaskIds}
        streak={streak}
      />
    )
  }

  return (
    <SetupScreen
      profile={profile as UserProfile}
      targetDate={targetDate}
      transferredTasks={initialTasks}
      initialAppointments={initialAppointments}
      showTransferBanner={showTransferBanner}
      scheduledTaskIds={scheduledTaskIds}
      streak={streak}
    />
  )
}
