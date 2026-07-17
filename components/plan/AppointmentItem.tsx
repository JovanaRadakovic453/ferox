'use client'

import { useState } from 'react'
import Checkbox from '@/components/ui/Checkbox'
import type { Appointment } from '@/types/ferox'
import { addDays, todayKey } from '@/lib/date'
import AnchoredMenu, { MenuHeading } from '@/components/ui/AnchoredMenu'
import { useT, useTimezone } from '@/components/i18n/I18nProvider'

export default function AppointmentItem({ appt, onToggle, onDelete, onMove, currentDate }: {
  appt: Appointment
  onToggle: () => void
  onDelete?: () => void
  /** Kad je prosleđeno, prikazuje se dugme „Pomeri" (drugi dan i/ili drugo vreme). */
  onMove?: (targetDateKey: string, newTime: string) => void
  /** Dan koji je trenutno prikazan — početni izbor u meniju. */
  currentDate?: string
}) {
  const t = useT()
  const tz = useTimezone()
  return (
    <div className="flex items-center w-full border-b" style={{ borderColor: 'var(--hairline)' }}>
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={appt.done}
        aria-label={`${appt.time} ${appt.name} (${t.move.apptSuffix})${appt.done ? t.move.doneAria : ''}`}
        className="flex items-center gap-3 flex-1 min-w-0 text-left py-4 transition-transform active:scale-[0.995]"
      >
        <span aria-hidden><Checkbox checked={appt.done} /></span>
        <span
          className="text-sm font-semibold tabular-nums shrink-0 transition-all duration-200"
          style={{ color: appt.done ? 'var(--text-muted)' : 'var(--gold)', opacity: appt.done ? 0.6 : 1 }}
        >
          {appt.time}
        </span>
        <p
          className="text-sm flex-1 truncate transition-all duration-200"
          style={{ color: appt.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: appt.done ? 'line-through' : 'none', opacity: appt.done ? 0.6 : 1 }}
        >
          {appt.name}
        </p>
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>{t.move.apptSuffix}</span>
      </button>

      {onMove && !appt.done && (
        <AnchoredMenu ariaLabel={t.move.aria(appt.name)} title={t.move.title} minWidth={220}>
          {(close) => (
            <MoveApptMenu
              t={t}
              appt={appt}
              currentDate={currentDate ?? todayKey(tz)}
              onMove={(d, time) => { close(); onMove(d, time) }}
            />
          )}
        </AnchoredMenu>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={t.move.deleteAria(appt.name)}
          className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >✕</button>
      )}
    </div>
  )
}

function MoveApptMenu({ t, appt, currentDate, onMove }: {
  t: ReturnType<typeof useT>
  appt: Appointment
  currentDate: string
  onMove: (dateKey: string, time: string) => void
}) {
  const tz = useTimezone()
  const today = todayKey(tz)
  const quick = [
    { label: t.move.today, key: today },
    { label: t.move.tomorrow, key: addDays(today, 1) },
    { label: t.move.dayAfter, key: addDays(today, 2) },
  ]

  const [day, setDay] = useState(currentDate)
  const [time, setTime] = useState(appt.time)
  const isQuick = quick.some(q => q.key === day)
  const [custom, setCustom] = useState(!isQuick)

  return (
    <div className="flex flex-col gap-2 p-0.5">
      <MenuHeading>{t.move.title}</MenuHeading>

      <div className="flex gap-1 px-1.5">
        {quick.map(q => {
          const on = day === q.key && !custom
          return (
            <button
              key={q.key}
              onClick={() => { setDay(q.key); setCustom(false) }}
              className="text-xs px-2 py-1.5 rounded-[var(--r-sm)] flex-1 transition-colors"
              style={{
                background: on ? 'var(--gold-tint)' : 'var(--surface2)',
                color: on ? 'var(--gold)' : 'var(--text-muted)',
                fontWeight: on ? 600 : 400,
              }}
            >
              {q.label}
            </button>
          )
        })}
      </div>

      <div className="px-1.5">
        {!custom ? (
          <button
            onClick={() => setCustom(true)}
            className="text-xs w-full text-left px-1 py-1 transition-opacity hover:opacity-100 opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.move.pickOtherDay}
          </button>
        ) : (
          <input
            type="date"
            min={today}
            value={day}
            onChange={(e) => { if (e.target.value) setDay(e.target.value) }}
            className="w-full text-sm rounded-[var(--r-sm)] px-2 py-1.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        )}
      </div>

      <label className="flex items-center gap-2 px-1.5">
        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{t.move.time}</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1 text-sm rounded-[var(--r-sm)] px-2 py-1.5 tabular-nums"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </label>

      <div className="px-1.5 pb-0.5">
        <button
          onClick={() => { if (time) onMove(day, time) }}
          disabled={!time || (day === currentDate && time === appt.time)}
          className="w-full text-sm font-medium px-2 py-2 rounded-[var(--r-sm)] transition-opacity disabled:opacity-40"
          style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}
        >
          {t.move.save}
        </button>
      </div>
    </div>
  )
}
