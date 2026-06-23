import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
import type { UserProfile, Task } from '@/types/ferox'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ sutra?: string }>
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

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = tomorrow.toISOString().split('T')[0]
  const targetDate = isSutra ? tomorrowKey : today

  const { data: entry } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('date_key', targetDate)
    .single()

  if (!isSutra) {
    const cookieStore = await cookies()
    const dayFinished = cookieStore.get('ferox_day_finished')?.value
    if (entry && dayFinished !== today) redirect('/plan')
  }

  const { data: transferred } = await supabase
    .from('transferred_tasks')
    .select('tasks')
    .eq('user_id', user.id)
    .eq('for_date', targetDate)
    .single()

  const transferredTasks = ((transferred?.tasks ?? []) as Task[]).filter((t: Task) => !t.done)

  return <SetupScreen profile={profile as UserProfile} targetDate={targetDate} transferredTasks={transferredTasks} />
}
