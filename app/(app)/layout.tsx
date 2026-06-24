import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-dvh flex justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[520px] flex flex-col">
        {children}
      </div>
    </div>
  )
}
