import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task } from '@/types/ferox'

// Izbor nedovršenih zadataka za prenos na sutra (pre "Završi dan").
export default function TransferPicker({
  unfinished, selected, onToggle, onConfirm, onBack, saving,
}: {
  unfinished: Task[]
  selected: Set<string>
  onToggle: (name: string) => void
  onConfirm: (toTransfer: Task[]) => void
  onBack: () => void
  saving: boolean
}) {
  const toTransfer = unfinished.filter(t => selected.has(t.name))
  return (
    <main className="flex flex-col gap-5 pb-2 lg:max-w-2xl lg:mx-auto lg:w-full">
      <div className="pt-1">
        <h2 className="display foil text-3xl lg:text-4xl">
          Nedovršeni zadaci
        </h2>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Izaberi šta da prenesemo za sutra:
        </p>
        <div className="h-px mt-4" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
      </div>

      <div className="flex flex-col gap-2">
        {unfinished.map(task => {
          const checked = selected.has(task.name)
          return (
            <button
              key={task.name}
              onClick={() => onToggle(task.name)}
              className="flex items-center gap-3 p-4 rounded-[var(--r-md)] text-left transition-all active:scale-[0.99]"
              style={{
                background: checked ? 'var(--gold-tint)' : 'var(--surface)',
                border: `1.5px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                boxShadow: 'var(--sh-sm)',
              }}
            >
              <Checkbox checked={checked} shape="round" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {TASK_TYPE_LABELS[task.type]}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => onConfirm(toTransfer)}
          loading={saving}
        >
          {toTransfer.length > 0
            ? `Prenesi ${toTransfer.length} ${toTransfer.length === 1 ? 'zadatak' : 'zadataka'} i završi dan`
            : 'Završi dan bez prenošenja'}
        </Button>
        <button
          onClick={onBack}
          className="text-sm text-center py-2"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Nazad na plan
        </button>
      </div>
    </main>
  )
}
