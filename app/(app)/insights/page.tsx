import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeAggregates, type DayAgg } from '@/lib/insights'
import { computeStreak } from '@/lib/streak'
import { todayKey } from '@/lib/date'
import InsightsView from '@/components/insights/InsightsView'

const MIN_DAYS = 5

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: entries }, { data: profile }, { data: finishedRows }, { data: zones }] = await Promise.all([
    supabase
      .from('day_entries')
      .select('id, date_key, sleep_hours')
      .eq('user_id', user.id)
      .order('date_key', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('rest_days, best_streak').eq('id', user.id).maybeSingle(),
    supabase
      .from('day_entries')
      .select('date_key')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('date_key', { ascending: false })
      .limit(60),
    supabase.from('zones').select('id, name, icon').eq('user_id', user.id),
  ])

  const list = entries ?? []
  const ids = list.map(e => e.id)

  const perEntry = new Map<string, { done: number; total: number }>()
  const zoneAgg = new Map<string, { done: number; total: number }>() // ključ = zone_id ili '__none__'
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('tasks').select('entry_id, zone_id, done').in('entry_id', ids)
    for (const t of tasks ?? []) {
      const c = perEntry.get(t.entry_id) ?? { done: 0, total: 0 }
      c.total += 1; if (t.done) c.done += 1
      perEntry.set(t.entry_id, c)
      const key = t.zone_id ?? '__none__'
      const za = zoneAgg.get(key) ?? { done: 0, total: 0 }
      za.total += 1; if (t.done) za.done += 1
      zoneAgg.set(key, za)
    }
  }

  // Prevedi zone_id → "ikona ime"; obrisane zone i zadaci bez oblasti idu u "Bez oblasti".
  const zoneById = new Map((zones ?? []).map(z => [z.id as string, z]))
  const byLabel = new Map<string, { done: number; total: number }>()
  for (const [key, v] of zoneAgg) {
    const z = key === '__none__' ? null : zoneById.get(key)
    const label = z ? `${z.icon} ${z.name}` : 'Bez oblasti'
    const cur = byLabel.get(label) ?? { done: 0, total: 0 }
    cur.done += v.done; cur.total += v.total
    byLabel.set(label, cur)
  }
  const zoneStats = [...byLabel.entries()].map(([label, v]) => ({ label, ...v }))

  const days: DayAgg[] = list.map(e => {
    const c = perEntry.get(e.id) ?? { done: 0, total: 0 }
    return {
      date_key: e.date_key,
      sleep_hours: e.sleep_hours,
      done: c.done,
      total: c.total,
      weekday: new Date(`${e.date_key}T12:00:00Z`).getUTCDay(),
    }
  })

  // Only days that actually had tasks count toward "logged days".
  const loggedDays = days.filter(d => d.total > 0)

  if (loggedDays.length < MIN_DAYS) {
    return (
      <main className="flex flex-col gap-6 pb-2">
        <header className="pt-2">
          <h1 className="display foil text-3xl">Uvidi</h1>
        </header>
        <div className="card p-8 text-center flex flex-col items-center gap-3">
          <span className="text-4xl">📈</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Još skupljam tvoje obrasce. Treba mi bar {MIN_DAYS} dana sa zadacima — imaš {loggedDays.length}.
            Nastavi da planiraš i ovde će se pojaviti tvoji uvidi.
          </p>
          <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Napravi plan →</Link>
        </div>
      </main>
    )
  }

  const agg = computeAggregates(loggedDays, zoneStats)

  const finishedSet = new Set((finishedRows ?? []).map(r => r.date_key as string))
  const streak = computeStreak(finishedSet, profile?.rest_days ?? [0, 6], todayKey())
  const totalDone = [...perEntry.values()].reduce((s, c) => s + c.done, 0)

  return (
    <InsightsView
      agg={agg}
      streak={streak}
      bestStreak={Math.max(profile?.best_streak ?? 0, streak)}
      totalDone={totalDone}
    />
  )
}
