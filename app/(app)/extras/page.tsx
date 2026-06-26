import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExtrasScreen from '@/components/extras/ExtrasScreen'
import { DEFAULTS } from '@/lib/config'

export default async function ExtrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, pomodoro_minutes').eq('id', user.id).single()

  return (
    <ExtrasScreen
      initialPomodoro={profile?.pomodoro_minutes ?? DEFAULTS.pomodoroMinutes}
      profileId={user.id}
    />
  )
}
