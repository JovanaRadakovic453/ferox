import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('completed_once, name')
    .eq('id', user.id)
    .single()

  if (profile?.completed_once) {
    redirect('/')
  }

  return <OnboardingFlow initialName={profile?.name ?? ''} />
}
