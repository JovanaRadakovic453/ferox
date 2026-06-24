import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
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
    .select('id, energy')
    .eq('user_id', user.id)
    .eq('date_key', targetDate)
    .maybeSingle()

  if (!isSutra && !isEdit && entry) {
    redirect('/plan')
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
