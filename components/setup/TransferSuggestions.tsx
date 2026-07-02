import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task } from '@/types/ferox'
import { SectionHeader } from '@/components/setup/primitives'

// Predloženi zadaci iz prethodnog dana (opt-in). Parent drži listu.
export default function TransferSuggestions({
  items, onAddAll, onAddOne, onDismiss,
}: {
  items: Task[]
  onAddAll: () => void
  onAddOne: (index: number) => void
  onDismiss: (index: number) => void
}) {
  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader
        icon="📋"
        title="Iz prethodnog dana"
        trailing={
          <button
            onClick={onAddAll}
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)' }}
          >
            Dodaj sve
          </button>
        }
      />
      <div className="flex flex-col gap-2.5">
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
            <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
              background: t.priority === 'high' ? 'var(--danger-tint)' : t.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
              color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
            }}>
              {t.priority === 'high' ? 'V' : t.priority === 'medium' ? 'S' : 'N'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TASK_TYPE_LABELS[t.type]}</p>
            </div>
            <button
              onClick={() => onAddOne(i)}
              className="text-xs font-semibold shrink-0 px-2.5 py-1.5 rounded-[10px] transition-all hover:brightness-95"
              style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}
            >
              + Dodaj
            </button>
            <button
              onClick={() => onDismiss(i)}
              className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
