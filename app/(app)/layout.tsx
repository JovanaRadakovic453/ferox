import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppChrome from '@/components/nav/AppChrome'
import { I18nProvider } from '@/components/i18n/I18nProvider'
import { toLocale } from '@/lib/locale'
import { computeStreak } from '@/lib/streak'
import { todayKey } from '@/lib/date'

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

  const [{ data: profile }, { data: finishedRows }] = await Promise.all([
    supabase.from('profiles').select('rest_days, locale').eq('id', user.id).single(),
    supabase.from('day_entries').select('date_key').eq('user_id', user.id).not('finished_at', 'is', null).order('date_key', { ascending: false }).limit(60),
  ])

  const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSet, profile?.rest_days ?? [0, 6], todayKey())

  return (
    <I18nProvider locale={toLocale(profile?.locale)}>
      <AppChrome streak={streak}>{children}</AppChrome>
    </I18nProvider>
  )
}
