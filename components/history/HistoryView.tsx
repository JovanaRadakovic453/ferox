'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export type HistoryDay = {
  id: string
  date_key: string
  energy: string | null
  sleep_hours: number | null
  finished_at: string | null
  done: number
  total: number
  pct: number
}

function weekLabel(dateKey: string, todayKey: string): string {
  const d = new Date(dateKey)
  const t = new Date(todayKey)
  const mondayOf = (dt: Date) => {
    const day = dt.getDay() === 0 ? 6 : dt.getDay() - 1
    const m = new Date(dt)
    m.setDate(m.getDate() - day)
    m.setHours(0, 0, 0, 0)
    return m
  }
  const weeksDiff = Math.round((mondayOf(t).getTime() - mondayOf(d).getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (weeksDiff === 0) return 'Ova nedelja'
  if (weeksDiff === 1) return 'Prošla nedelja'
  return `${weeksDiff} nedelje pre`
}

function groupByWeek(days: HistoryDay[], todayKey: string): { label: string; days: HistoryDay[] }[] {
  const groups: { label: string; days: HistoryDay[] }[] = []
  for (const d of days) {
    const label = weekLabel(d.date_key, todayKey)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.days.push(d)
    } else {
      groups.push({ label, days: [d] })
    }
  }
  return groups
}

export default function HistoryView({ days, todayKey }: { days: HistoryDay[]; todayKey: string }) {
  const groups = groupByWeek(days, todayKey)

  return (
    <main className="flex flex-col gap-6 lg:gap-7 pb-2">
      <header className="pt-2">
        <div className="hidden lg:block mb-2"><span className="section-label">Tvoj ritam</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">Istorija</h1>
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
        <div className="flex flex-col gap-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="section-label mb-3">{group.label}</p>
              <div className="flex flex-col gap-2">
                {group.days.map(d => (
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
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
