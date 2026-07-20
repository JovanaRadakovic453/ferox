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
          {/* Kraj se prikazuje samo ako ga znamo (npr. iz Google Kalendara). */}
          {appt.end_time ? `${appt.time} – ${appt.end_time}` : appt.time}
        </span>
        <p
          className="text-[0.925rem] flex-1 truncate transition-all duration-200"
          style={{ color: appt.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: appt.done ? 'line-through' : 'none', opacity: appt.done ? 0.6 : 1 }}
        >
          {appt.name}
        </p>
        {/* Uvučen iz Google Kalendara — korisnik vidi odakle je, a ✕ ga sklanja. */}
        {appt.google_event_id && (
          <span
            className="text-xs px-1.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
            title={t.setup.fromGoogle}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </span>
        )}
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
