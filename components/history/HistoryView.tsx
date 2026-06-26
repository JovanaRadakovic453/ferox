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


export default function HistoryView({ days }: { days: HistoryDay[] }) {
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
        <>
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
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
