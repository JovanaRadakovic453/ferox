import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
import EodLanding from '@/components/plan/EodLanding'
import { todayKey, tomorrowKey } from '@/lib/date'
import { energyLevelFromLabel } from '@/lib/energy'
import type { UserProfile, Task } from '@/types/ferox'

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
    .select('id, energy, finished_at, eod_recap, reflection')
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
    const [{ data: dayTasks }, { data: transferred }, { data: tomorrowEntry }] = await Promise.all([
      supabase.from('tasks').select('done').eq('entry_id', entry.id).eq('user_id', user.id),
      supabase.from('transferred_tasks').select('tasks').eq('user_id', user.id).eq('for_date', tomorrowKey()).maybeSingle(),
      supabase.from('day_entries').select('id').eq('user_id', user.id).eq('date_key', tomorrowKey()).maybeSingle(),
    ])
    const total = dayTasks?.length ?? 0
    const doneCount = (dayTasks ?? []).filter(t => t.done).length
    const transferredCount = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done).length
    return (
      <EodLanding
        doneCount={doneCount}
        total={total}
        transferredCount={transferredCount}
        tomorrowPlanned={!!tomorrowEntry}
        dateKey={targetDate}
        eodRecap={entry.eod_recap}
        reflection={entry.reflection}
      />
    )
  }

  // Ako vec postoji plan za targetDate, ucitaj te zadatke i izabranu energiju
  // Inace ucitaj prenesene zadatke iz prethodnog dana
  let initialTasks: Task[] = []
  let initialEnergy: number | null = null
  let showTransferBanner = false

  if (entry) {
    initialEnergy = energyLevelFromLabel(entry.energy)
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('name, note, priority, type, done, position')
      .eq('entry_id', entry.id)
      .eq('user_id', user.id)
      .order('position')
    initialTasks = (existingTasks ?? []) as Task[]
  } else {
    const { data: transferred } = await supabase
      .from('transferred_tasks')
      .select('tasks')
      .eq('user_id', user.id)
      .eq('for_date', targetDate)
      .maybeSingle()
    const filtered = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done)
    initialTasks = filtered
    showTransferBanner = filtered.length > 0
  }

  return (
    <SetupScreen
      profile={profile as UserProfile}
      targetDate={targetDate}
      transferredTasks={initialTasks}
      initialEnergy={initialEnergy}
      showTransferBanner={showTransferBanner}
    />
  )
}
