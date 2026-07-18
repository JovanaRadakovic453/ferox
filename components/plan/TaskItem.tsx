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
          {(dl || task.google_event_id) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {dl && (
                <span
                  className="inline-flex items-center gap-1 text-[0.62rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: dl.color, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
                >
                  <span aria-hidden>▲</span> {dl.text}
                </span>
              )}
              {/* Uvučen iz Google Kalendara — vidi se odakle je, a ✕ ga sklanja. */}
              {task.google_event_id && (
                <span
                  className="inline-flex items-center gap-1 text-[0.62rem] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
                  title={t.setup.fromGoogle}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </span>
              )}
            </div>
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
