import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('day_entries')
    .select('id, date_key, energy, sleep_hours, finished_at')
    .eq('user_id', user.id)
    .order('date_key', { ascending: false })
    .limit(30)

  const list = entries ?? []
  const ids = list.map(e => e.id)

  // Single query for all tasks of those days, then aggregate in memory.
  const counts = new Map<string, { done: number; total: number }>()
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('tasks').select('entry_id, done').in('entry_id', ids)
    for (const t of tasks ?? []) {
      const c = counts.get(t.entry_id) ?? { done: 0, total: 0 }
      c.total += 1
      if (t.done) c.done += 1
      counts.set(t.entry_id, c)
    }
  }

  const days = list.map(e => {
    const c = counts.get(e.id) ?? { done: 0, total: 0 }
    return { ...e, done: c.done, total: c.total, pct: c.total ? Math.round((c.done / c.total) * 100) : 0 }
  })

  // 7-day completion strip (oldest→newest of the most recent 7).
  const strip = [...days].slice(0, 7).reverse()

  return (
    <main className="flex flex-col gap-6 pb-2">
      <header className="pt-2">
        <h1 className="display foil text-3xl">Istorija</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Tvojih poslednjih {days.length} {days.length === 1 ? 'dan' : 'dana'}.
        </p>
      </header>

      {days.length === 0 ? (
        <div className="card p-8 text-center flex flex-col items-center gap-3">
          <span className="text-4xl">🗓️</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Još nema istorije. Kad završiš prvi dan, pojaviće se ovde.
          </p>
          <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Napravi plan →</Link>
        </div>
      ) : (
        <>
          {strip.length > 1 && (
            <div className="card p-5">
              <p className="section-label mb-3">Poslednjih 7 dana</p>
              <div className="flex items-end justify-between gap-1.5 h-20">
                {strip.map(d => (
                  <div key={d.id} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-full overflow-hidden flex items-end" style={{ height: '100%', background: 'var(--surface2)' }}>
                      <div className="w-full rounded-full transition-all" style={{ height: `${Math.max(6, d.pct)}%`, backgroundImage: 'linear-gradient(180deg, var(--gold-light), var(--gold))' }} />
                    </div>
                    <span className="text-[0.55rem] tabular-nums" style={{ color: 'var(--text-muted)' }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {days.map(d => (
              <Link
                key={d.id}
                href={`/plan?date=${d.date_key}`}
                className="card card-interactive p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{formatDate(d.date_key)}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {d.energy && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>{d.energy}</span>}
                    {d.sleep_hours != null && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>😴 {d.sleep_hours}h</span>}
                    {d.finished_at && <span className="text-xs" style={{ color: 'var(--gold)' }}>✓ završen</span>}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="display text-2xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>
                    {d.done}<span className="text-sm" style={{ color: 'var(--text-muted)' }}>/{d.total}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
