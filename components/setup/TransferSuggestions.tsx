'use client'

import type { Task } from '@/types/ferox'
import { SectionHeader, type SectionIconName } from '@/components/setup/primitives'
import { useT } from '@/components/i18n/I18nProvider'

export default function TransferSuggestions({
  items, onAddAll, onAddOne, onDismiss, title, icon = 'history',
}: {
  items: Task[]
  onAddAll: () => void
  onAddOne: (index: number) => void
  onDismiss: (index: number) => void
  title?: string
  icon?: SectionIconName
}) {
  const t = useT()
  const prioText = (p: string) => p === 'high' ? t.setup.prioHigh : p === 'medium' ? t.setup.prioMed : t.setup.prioLow
  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader
        icon={icon}
        title={title ?? t.setup.fromPrevDay}
        trailing={
          <button
            onClick={onAddAll}
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)' }}
          >
            {t.setup.addAll}
          </button>
        }
      />
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-sm)]" style={{ background: 'var(--surface2)' }}>
            <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
              background: item.priority === 'high' ? 'var(--danger-tint)' : item.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
              color: item.priority === 'high' ? 'var(--danger)' : item.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
            }}>
              {t.priorityShort[item.priority]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{prioText(item.priority)}</p>
            </div>
            <button
              onClick={() => onAddOne(i)}
              className="text-xs font-semibold shrink-0 px-2.5 py-1.5 rounded-[10px] transition-all hover:brightness-95"
              style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}
            >
              {t.setup.add}
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
