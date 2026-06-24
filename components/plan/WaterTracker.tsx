// Voda — mali tracker (samo za današnji dan). Optimistički unos živi u roditelju.
export default function WaterTracker({
  water, goal, onAdd,
}: {
  water: number
  goal: number
  onAdd: (ml: number) => void
}) {
  return (
    <div className="card p-4 flex items-center gap-3 lg:w-[20rem] shrink-0">
      <span className="text-xl" aria-hidden>💧</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>Voda</span><span className="tabular-nums">{water}/{goal} ml</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (water / goal) * 100)}%`, backgroundImage: 'linear-gradient(90deg, #7cc6e8, #3b9fd4)' }} />
        </div>
      </div>
      <button onClick={() => onAdd(250)} className="text-xs font-semibold px-3 py-2 rounded-[var(--r-md)] shrink-0 transition-[filter] hover:brightness-105" style={{ background: 'var(--surface2)', color: 'var(--text)' }}>+250</button>
    </div>
  )
}
