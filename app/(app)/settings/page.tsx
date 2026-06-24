import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/settings/SettingsForm'
import type { UserProfile } from '@/types/ferox'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  return <SettingsForm profile={profile as UserProfile} email={user.email ?? ''} />
}
