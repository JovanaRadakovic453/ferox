export default function DayProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }}
      />
    </div>
  )
}
