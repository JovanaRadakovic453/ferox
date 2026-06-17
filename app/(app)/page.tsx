import { createClient } from '@/lib/supabase/server'
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

  // Check if today's plan already exists
  const today = new Date().toISOString().split('T')[0]
  const { data: entry } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('date_key', today)
    .single()

  if (entry) redirect('/plan')

  return <SetupScreen profile={profile as UserProfile} />
}
