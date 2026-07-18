'use client'

import { useState } from 'react'
import Checkbox from '@/components/ui/Checkbox'
import type { Task } from '@/types/ferox'
import { addDays, todayKey, tomorrowKey } from '@/lib/date'
import { getDeadlineBadge } from '@/lib/deadline'
import AnchoredMenu, { MenuHeading, MenuItem } from '@/components/ui/AnchoredMenu'
import { useT, useLocale, useTimezone } from '@/components/i18n/I18nProvider'

export default function TaskItem({ task, onToggle, onDelete, onSnooze }: {
  task: Task
  onToggle: () => void
  onDelete?: () => void
  /** Kad je prosleđeno, prikazuje se dugme „Odloži" (premesti zadatak na drugi dan). */
  onSnooze?: (targetDateKey: string) => void
}) {
  const t = useT()
  const locale = useLocale()
  const tz = useTimezone()
  // Rok se vidi na samoj kartici — dok zadatak nije gotov.
  const dl = task.deadline_date && !task.done ? getDeadlineBadge(task.deadline_date, todayKey(tz), locale) : null
  return (
    <div className="flex items-center w-full py-4">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.name} — ${t.priority[task.priority]}${task.done ? t.snooze.doneAria : ''}`}
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
          {dl && (
            <span
              className="inline-flex items-center gap-1 text-[0.62rem] font-semibold mt-1 px-2 py-0.5 rounded-full"
              style={{ color: dl.color, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
            >
              <span aria-hidden>▲</span> {dl.text}
            </span>
          )}
        </div>
        <span
          className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 tracking-wide"
          title={t.priority[task.priority]}
          style={{
            background: task.priority === 'high' ? 'var(--danger-tint)' : task.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
            color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          <span aria-hidden>{t.priorityShort[task.priority]}</span>
          <span className="sr-only">{t.priority[task.priority]}</span>
        </span>
      </button>

      {onSnooze && !task.done && (
        <AnchoredMenu ariaLabel={t.snooze.aria(task.name)} title={t.snooze.title}>
          {(close) => <SnoozeMenu t={t} onPick={(d) => { close(); onSnooze(d) }} />}
        </AnchoredMenu>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`${t.common.delete} ${task.name}`}
          className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

function SnoozeMenu({ t, onPick }: { t: ReturnType<typeof useT>; onPick: (dateKey: string) => void }) {
  const [pickDate, setPickDate] = useState(false)
  const tz = useTimezone()
  return (
    <>
      <MenuHeading>{t.snooze.heading}</MenuHeading>
      <MenuItem label={t.snooze.tomorrow} onClick={() => onPick(tomorrowKey(tz))} />
      <MenuItem label={t.snooze.dayAfter} onClick={() => onPick(addDays(todayKey(tz), 2))} />
      {!pickDate ? (
        <MenuItem label={t.snooze.pickDay} onClick={() => setPickDate(true)} />
      ) : (
        <div className="px-1.5 pt-1">
          <input
            type="date"
            min={tomorrowKey(tz)}
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
