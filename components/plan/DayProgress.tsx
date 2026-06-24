import type { PlanBlock } from '@/types/ferox'

/** Segmented day progress — one segment per active time-block, so the bar
 *  reads as the shape of the whole day rather than a single anonymous fill.
 *  Extracted from PlanScreen so History/Insights/EOD can reuse it. */
export default function DayProgress({ blocks }: { blocks: PlanBlock[] }) {
  const active = blocks.filter(b => b.tasks.length > 0)
  if (active.length === 0) {
    return <div className="h-2.5 rounded-full" style={{ background: 'var(--surface2)' }} />
  }
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {active.map(b => {
        const done = b.tasks.filter(t => t.done).length
        const pct = b.tasks.length ? (done / b.tasks.length) * 100 : 0
        return (
          <div key={b.label} className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)', boxShadow: 'inset 0 1px 2px rgba(26,23,20,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }}
            />
          </div>
        )
      })}
    </div>
  )
}
