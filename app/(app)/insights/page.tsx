import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeAggregates, forecastTomorrow, type DayAgg } from '@/lib/insights'
import { tomorrowKey } from '@/lib/date'
import InsightsView from '@/components/insights/InsightsView'
import type { TaskType } from '@/types/ferox'

const MIN_DAYS = 5

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('day_entries')
    .select('id, date_key, energy_level, sleep_hours')
    .eq('user_id', user.id)
    .order('date_key', { ascending: false })
    .limit(30)

  const list = entries ?? []
  const ids = list.map(e => e.id)

  const perEntry = new Map<string, { done: number; total: number }>()
  const typeAgg = new Map<TaskType, { done: number; total: number }>()
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('tasks').select('entry_id, type, done').in('entry_id', ids)
    for (const t of tasks ?? []) {
      const c = perEntry.get(t.entry_id) ?? { done: 0, total: 0 }
      c.total += 1; if (t.done) c.done += 1
      perEntry.set(t.entry_id, c)
      const tt = (t.type as TaskType)
      const ta = typeAgg.get(tt) ?? { done: 0, total: 0 }
      ta.total += 1; if (t.done) ta.done += 1
      typeAgg.set(tt, ta)
    }
  }

  const days: DayAgg[] = list.map(e => {
    const c = perEntry.get(e.id) ?? { done: 0, total: 0 }
    return {
      date_key: e.date_key,
      energy_level: e.energy_level,
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
            Nastavi da planiraš i ovde će se pojaviti tvoji uvidi i prognoza energije.
          </p>
          <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Napravi plan →</Link>
        </div>
      </main>
    )
  }

  const agg = computeAggregates(loggedDays, [...typeAgg.entries()].map(([type, v]) => ({ type, ...v })))
  const tWeekday = new Date(`${tomorrowKey()}T12:00:00Z`).getUTCDay()
  const forecast = forecastTomorrow(loggedDays, tWeekday)

  return <InsightsView agg={agg} forecast={forecast} />
}
