'use client'

import { useState } from 'react'
import Checkbox from '@/components/ui/Checkbox'
import { PRIORITY_LABELS } from '@/types/ferox'
import type { Task } from '@/types/ferox'
import { addDays, todayKey, tomorrowKey } from '@/lib/date'
import AnchoredMenu, { MenuHeading, MenuItem } from '@/components/ui/AnchoredMenu'

export default function TaskItem({ task, onToggle, onDelete, onSnooze }: {
  task: Task
  onToggle: () => void
  onDelete?: () => void
  /** Kad je prosleđeno, prikazuje se dugme „Odloži" (premesti zadatak na drugi dan). */
  onSnooze?: (targetDateKey: string) => void
}) {
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

      {onSnooze && !task.done && (
        <AnchoredMenu ariaLabel={`Odloži ${task.name} za drugi dan`} title="Odloži za drugi dan">
          {(close) => <SnoozeMenu onPick={(d) => { close(); onSnooze(d) }} />}
        </AnchoredMenu>
      )}

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

function SnoozeMenu({ onPick }: { onPick: (dateKey: string) => void }) {
  const [pickDate, setPickDate] = useState(false)
  return (
    <>
      <MenuHeading>Odloži za</MenuHeading>
      <MenuItem label="Sutra" onClick={() => onPick(tomorrowKey())} />
      <MenuItem label="Prekosutra" onClick={() => onPick(addDays(todayKey(), 2))} />
      {!pickDate ? (
        <MenuItem label="Izaberi dan…" onClick={() => setPickDate(true)} />
      ) : (
        <div className="px-1.5 pt-1">
          <input
            type="date"
            min={tomorrowKey()}
            autoFocus
            onChange={(e) => { if (e.target.value) onPick(e.target.value) }}
            className="w-full text-sm rounded-[var(--r-sm)] px-2 py-1.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
      )}
    </>
  )
}
