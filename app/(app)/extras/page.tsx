import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExtrasScreen from '@/components/extras/ExtrasScreen'
import { DEFAULTS } from '@/lib/config'
import type { Routine } from '@/types/ferox'

export default async function ExtrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: routines }] = await Promise.all([
    supabase.from('profiles').select('id, pomodoro_minutes').eq('id', user.id).single(),
    supabase.from('routines').select('*').eq('user_id', user.id).order('created_at'),
  ])

  return (
    <ExtrasScreen
      initialPomodoro={profile?.pomodoro_minutes ?? DEFAULTS.pomodoroMinutes}
      profileId={user.id}
      initialRoutines={(routines ?? []) as Routine[]}
    />
  )
}
