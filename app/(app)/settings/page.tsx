import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/settings/SettingsForm'
import type { UserProfile, Zone } from '@/types/ferox'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: zones }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('zones').select('*').eq('user_id', user.id).order('position'),
  ])
  if (!profile) redirect('/onboarding')

  return <SettingsForm profile={profile as UserProfile} email={user.email ?? ''} zones={(zones ?? []) as Zone[]} />
}
