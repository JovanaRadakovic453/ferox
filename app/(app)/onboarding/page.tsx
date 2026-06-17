import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

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

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center p-5 text-center"
      style={{ color: 'var(--text)' }}
    >
      <h1
        className="text-5xl font-light mb-3"
        style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}
      >
        Dobrodošla, {profile?.name || 'tu'}!
      </h1>
      <p className="text-base mb-8 max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
        Hajde da podesimo Ferox prema tvojim navikama
      </p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        5-koračni onboarding — Faza 3 (coming soon)
      </p>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  )
}
