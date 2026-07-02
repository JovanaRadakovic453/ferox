import Checkbox from '@/components/ui/Checkbox'
import { PRIORITY_LABELS } from '@/types/ferox'
import type { Task } from '@/types/ferox'

export default function TaskItem({ task, onToggle, onDelete, zoneName }: { task: Task; onToggle: () => void; onDelete?: () => void; zoneName?: string }) {
  return (
    <div className="flex items-center w-full py-4">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.name} — ${PRIORITY_LABELS[task.priority]}${task.done ? ', završeno' : ''}`}
        className="flex items-start gap-3 flex-1 min-w-0 text-left transition-transform active:scale-[0.995]"
      >
        <span className="mt-0.5" aria-hidden><Checkbox checked={task.done} /></span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[0.925rem] font-medium transition-all duration-200"
            style={{
              color: task.done ? 'var(--text-muted)' : 'var(--text)',
              textDecoration: task.done ? 'line-through' : 'none',
              opacity: task.done ? 0.6 : 1,
            }}
          >
            {task.name}
          </p>
          {task.note && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.note}</p>
          )}
          {zoneName && !task.done && (
            <span
              className="inline-flex items-center gap-1 text-[0.62rem] font-medium mt-1.5 px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)', color: 'var(--text-muted)' }}
            >
              {zoneName}
            </span>
          )}
        </div>
        <span
          className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 tracking-wide"
          title={PRIORITY_LABELS[task.priority]}
          style={{
            background: task.priority === 'high' ? 'var(--danger-tint)' : task.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
            color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          <span aria-hidden>{task.priority === 'high' ? 'V' : task.priority === 'medium' ? 'S' : 'N'}</span>
          <span className="sr-only">{PRIORITY_LABELS[task.priority]}</span>
        </span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Obriši ${task.name}`}
          className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
