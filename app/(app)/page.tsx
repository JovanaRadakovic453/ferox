import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
import EodLanding from '@/components/plan/EodLanding'
import { todayKey, tomorrowKey, toTimezone } from '@/lib/date'
import { computeStreak } from '@/lib/streak'
import { scheduledOnDay } from '@/lib/schedule'
import type { UserProfile, Task, Appointment } from '@/types/ferox'

// Bez ovoga pregledač pamti prethodni prikaz ove strane: zakažeš zadatak u
// Kalendaru, vratiš se na "Danas" — i vidiš STARU sliku bez njega. Primećivalo se
// tako što se zadatak pojavi tek posle "Obriši sve i počni iznova" (to radi pravi
// reload strane). Ista zaštita već stoji na /plan.
export const dynamic = 'force-dynamic'

// Red iz `scheduled_tasks` onako kako ga ove dve strane povlače (bez `done` — filtriran je upitom).
//
// Koji dani "hvataju" zadatak određuje `scheduledOnDay` (lib/schedule.ts) — ISTO
// pravilo po kom se crta i Kalendar, da se prikaz i plan nikad ne raziđu:
//   • ima rok  → svaki dan od početka do roka (projekat se radi više dana)
//   • bez roka → samo svoj dan (inače bi se svaki ikad zakazan zadatak vraćao doveka)
//   • serija   → samo svoj dan (propušten utorak se ne gomila u sredu)
type ScheduledPick = Pick<Task, 'name' | 'priority'> & {
  id: string
  type?: Task['type']
  note?: string | null
  deadline_date?: string | null
  for_date: string
  repeat_id: string | null
}

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

  const tz = toTimezone(profile.timezone)
  const params = await searchParams
  const isSutra = params.sutra === '1'
  const isEdit = params.edit === '1'

  const targetDate = isSutra ? tomorrowKey(tz) : todayKey(tz)

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
      supabase.from('transferred_tasks').select('tasks').eq('user_id', user.id).eq('for_date', tomorrowKey(tz)).maybeSingle(),
      supabase.from('day_entries').select('date_key').eq('user_id', user.id).not('finished_at', 'is', null).order('date_key', { ascending: false }).limit(60),
    ])
    const total = dayTasks?.length ?? 0
    const doneCount = (dayTasks ?? []).filter(t => t.done).length
    const transferredCount = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done).length

    const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
    const streak = computeStreak(finishedSet, profile.rest_days ?? [0, 6], todayKey(tz))
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
        pushEnabled={!!profile.push_subscription}
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
  const streak = computeStreak(finishedSetForStreak, profile.rest_days ?? [0, 6], todayKey(tz))

  // Ako vec postoji plan za targetDate, ucitaj te zadatke i izabranu energiju
  // Inace ucitaj prenesene zadatke iz prethodnog dana
  let initialTasks: Task[] = []
  let initialAppointments: Appointment[] = []
  let showTransferBanner = false

  if (entry) {
    const [{ data: existingTasks }, { data: existingAppts }, { data: pendingScheduled }] = await Promise.all([
      supabase
        .from('tasks')
        .select('name, note, priority, type, done, position, deadline_date, scheduled_id')
        .eq('entry_id', entry.id)
        .eq('user_id', user.id)
        .order('position'),
      // Bez "nadgrobnih" (dismissed) redova — to su sklonjeni Google događaji;
      // u editoru bi vaskrsli kao obični termini. google_event_id ide s redom
      // da veza preživi ponovno snimanje.
      supabase
        .from('appointments')
        .select('id, name, time, end_time, reminder, done, google_event_id')
        .eq('user_id', user.id)
        .eq('date_key', targetDate)
        .eq('dismissed', false)
        .order('time'),
      supabase
        .from('scheduled_tasks')
        .select('id, name, priority, type, note, deadline_date, for_date, repeat_id')
        .eq('user_id', user.id)
        .lte('for_date', targetDate)
        .eq('done', false),
    ])
    // Vezu ka Kalendaru (scheduled_id) vraćamo kao klijentski `scheduledId`, da
    // preživi ponovno snimanje — inače bi se izmenom dana veza tiho izgubila.
    initialTasks = ((existingTasks ?? []) as (Task & { scheduled_id?: string | null })[])
      .map(({ scheduled_id, ...t }) => ({ ...t, scheduledId: scheduled_id ?? undefined }))
    initialAppointments = (existingAppts ?? []) as Appointment[]
    // Zakazan zadatak dodat POSLE kreiranja dana: ubaci ga u editor umesto da se tiho proguta.
    // Rok ide sa njim — inače bi nestao čim zadatak uđe u plan.
    // Od migracije 0022 zakazan zadatak ostaje otvoren (done=false) i dok JESTE u
    // planu, pa se već uneti preskaču po vezi — inače bi se u editoru duplirali.
    const linkedIds = new Set(initialTasks.map(t => t.scheduledId).filter(Boolean))
    const pending = scheduledOnDay((pendingScheduled ?? []) as ScheduledPick[], targetDate)
      .filter(t => !linkedIds.has(t.id))
    if (pending.length > 0) {
      initialTasks = [
        ...initialTasks,
        ...pending.map(t => ({ name: t.name, priority: t.priority, type: t.type ?? 'light', note: t.note ?? '', done: false, deadline_date: t.deadline_date ?? null, scheduledId: t.id })),
      ]
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
        .select('id, name, priority, type, note, deadline_date, for_date, repeat_id')
        .eq('user_id', user.id)
        .lte('for_date', targetDate)
        .eq('done', false),
      // Već sačuvani termini za taj dan (npr. iz brain dump-a) — da se učitaju i prežive.
      supabase
        .from('appointments')
        .select('id, name, time, end_time, reminder, done, google_event_id')
        .eq('user_id', user.id)
        .eq('date_key', targetDate)
        .eq('dismissed', false)
        .order('time'),
    ])
    initialAppointments = (apptRows ?? []) as Appointment[]
    const filtered = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done)
    const scheduled = scheduledOnDay((scheduledRows ?? []) as ScheduledPick[], targetDate)
    // Zakazani za ovaj dan idu PRAVO u plan (korisnik ih je u kalendaru već
    // zakazao za taj dan) — ne kao predlog. scheduledId putuje s njima da bi se
    // pri snimanju označili SAMO oni koji su stvarno ostali u planu.
    const scheduledMapped = scheduled.map(t => ({ name: t.name, priority: t.priority, type: t.type ?? 'light', note: t.note ?? '', done: false, deadline_date: t.deadline_date ?? null, scheduledId: t.id }))
    initialTasks = filtered
    // Baner/predlozi su samo za PRENESENE zadatke (tu korisnik bira).
    showTransferBanner = filtered.length > 0
    return (
      <SetupScreen
        profile={profile as UserProfile}
        targetDate={targetDate}
        transferredTasks={initialTasks}
        autoTasks={scheduledMapped}
        initialAppointments={initialAppointments}
        showTransferBanner={showTransferBanner}
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
      streak={streak}
    />
  )
}
