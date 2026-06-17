import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('completed_once, name')
    .eq('id', user.id)
    .single()

  if (!profile?.completed_once) {
    redirect('/onboarding')
  }

  return (
    <main className="p-5 flex flex-col gap-4" style={{ color: 'var(--text)' }}>
      <div className="flex items-center justify-between pt-2">
        <h1
          className="text-3xl font-light"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}
        >
          Ferox
        </h1>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Zdravo, {profile?.name || 'korisniče'}
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Setup ekran — Faza 4 (coming soon)
      </p>
    </main>
  )
}
