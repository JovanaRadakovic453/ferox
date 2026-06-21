import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SetupScreen from '@/components/setup/SetupScreen'
import type { UserProfile } from '@/types/ferox'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.completed_once) redirect('/onboarding')

  const today = new Date().toISOString().split('T')[0]
  const { data: entry } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('date_key', today)
    .single()

  // Ako dan nije označen kao završen, idi na plan
  const cookieStore = await cookies()
  const dayFinished = cookieStore.get('ferox_day_finished')?.value
  if (entry && dayFinished !== today) redirect('/plan')

  return <SetupScreen profile={profile as UserProfile} />
}
