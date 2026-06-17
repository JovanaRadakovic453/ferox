import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanScreen from '@/components/plan/PlanScreen'
import type { Task, DayEntry, UserProfile } from '@/types/ferox'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: profile }, { data: entry }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('day_entries').select('*').eq('user_id', user.id).eq('date_key', today).single(),
  ])

  if (!entry) redirect('/')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('entry_id', entry.id)
    .order('position')

  return (
    <PlanScreen
      entry={entry as DayEntry}
      tasks={(tasks ?? []) as Task[]}
      profile={profile as UserProfile}
    />
  )
}
