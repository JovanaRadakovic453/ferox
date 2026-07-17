import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeAggregates, type DayAgg } from '@/lib/insights'
import { buildConsistencyWeeks } from '@/lib/consistency'
import { computeStreak } from '@/lib/streak'
import { todayKey } from '@/lib/date'
import InsightsView from '@/components/insights/InsightsView'
import { getDict } from '@/lib/i18n/dict'
import { toLocale } from '@/lib/locale'

const MIN_DAYS = 5

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: entries }, { data: profile }, { data: finishedRows }] = await Promise.all([
    supabase
      .from('day_entries')
      .select('id, date_key, sleep_hours')
      .eq('user_id', user.id)
      .order('date_key', { ascending: false })
      .limit(91), // ~13 nedelja za kalendar doslednosti; statistika i dalje gleda skorijih 30
    supabase.from('profiles').select('rest_days, best_streak, locale').eq('id', user.id).maybeSingle(),
    supabase
      .from('day_entries')
      .select('date_key')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('date_key', { ascending: false })
      .limit(60),
  ])

  const list = entries ?? []
  const ids = list.map(e => e.id)

  const perEntry = new Map<string, { done: number; total: number }>()
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('tasks').select('entry_id, done').in('entry_id', ids)
    for (const t of tasks ?? []) {
      const c = perEntry.get(t.entry_id) ?? { done: 0, total: 0 }
      c.total += 1; if (t.done) c.done += 1
      perEntry.set(t.entry_id, c)
    }
  }

  // Statistika (realizacija, san, po danu) gleda skorijih 30 dana — kao i dosad.
  const recentList = list.slice(0, 30)
  const days: DayAgg[] = recentList.map(e => {
    const c = perEntry.get(e.id) ?? { done: 0, total: 0 }
    return {
      date_key: e.date_key,
      sleep_hours: e.sleep_hours,
      done: c.done,
      total: c.total,
      weekday: new Date(`${e.date_key}T12:00:00Z`).getUTCDay(),
    }
  })

  // Kalendar doslednosti gleda ceo prozor (~13 nedelja).
  const consistencyWeeks = buildConsistencyWeeks(
    list.map(e => {
      const c = perEntry.get(e.id) ?? { done: 0, total: 0 }
      return { date_key: e.date_key, done: c.done, total: c.total }
    }),
    todayKey(),
    13,
  )

  const t = getDict(toLocale(profile?.locale))

  // Only days that actually had tasks count toward "logged days".
  const loggedDays = days.filter(d => d.total > 0)

  if (loggedDays.length < MIN_DAYS) {
    return (
      <main className="flex flex-col gap-6 pb-2">
        <header className="pt-2">
          <h1 className="display foil text-3xl">{t.insights.title}</h1>
        </header>
        <div className="card p-8 text-center flex flex-col items-center gap-3">
          <span className="text-4xl">📈</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.insights.notEnough(MIN_DAYS, loggedDays.length)}
          </p>
          <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{t.history.makePlan}</Link>
        </div>
      </main>
    )
  }

  const agg = computeAggregates(loggedDays, {
    weekdays: t.insights.weekdays,
    sleepInsight: t.insights.sleepInsight,
  })

  const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSet, profile?.rest_days ?? [0, 6], todayKey())
  const totalDone = recentList.reduce((s, e) => s + (perEntry.get(e.id)?.done ?? 0), 0)

  return (
    <InsightsView
      agg={agg}
      streak={streak}
      bestStreak={Math.max(profile?.best_streak ?? 0, streak)}
      totalDone={totalDone}
      consistencyWeeks={consistencyWeeks}
    />
  )
}
