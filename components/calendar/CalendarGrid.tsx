'use client'

import { useT } from '@/components/i18n/I18nProvider'
import { scheduledDateSet } from '@/lib/schedule'

type Entry = { id: string; date_key: string; finished_at: string | null }
type Appointment = { id: string; date_key: string; name: string; time: string; done: boolean }
type ScheduledTask = { id: string; for_date: string; name: string; priority: string; note: string; remind_before_minutes: number | null; deadline_date: string | null; repeat_id?: string | null }

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getMonthGridDays(month: string): string[] {
  const [year, m] = month.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, m - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const firstDow = (firstDay.getUTCDay() + 6) % 7 // Mon=0

  const days: string[] = []

  // Prev month padding
  for (let i = firstDow - 1; i >= 0; i--) {
    days.push(toDateKey(new Date(Date.UTC(year, m - 1, -i))))
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${month}-${String(d).padStart(2, '0')}`)
  }

  // Fill to 42 cells (6 rows)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push(toDateKey(new Date(Date.UTC(year, m, i))))
  }

  return days
}

function getWeekDays(anchor: string): string[] {
  const d = new Date(`${anchor}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    days.push(toDateKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow + i))))
  }
  return days
}

export default function CalendarGrid({
  view,
  month,
  today,
  entries,
  taskCountByDate,
  appointments,
  scheduled,
  selectedDate,
  onSelectDate,
}: {
  view: 'month' | 'week'
  month: string
  today: string
  entries: Entry[]
  taskCountByDate: Record<string, number>
  appointments: Appointment[]
  scheduled: ScheduledTask[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}) {
  const t = useT()
  const days = view === 'month'
    ? getMonthGridDays(month)
    : getWeekDays(selectedDate ?? today)

  const finishedSet = new Set(entries.filter(e => !!e.finished_at).map(e => e.date_key))
  const hasEntrySet = new Set(entries.map(e => e.date_key))

  // Build per-date lookup for appointments and scheduled tasks
  const apptDateSet = new Set(appointments.map(a => a.date_key))
  // Zadatak sa rokom "zauzima" sve dane od početka do roka — ne samo prvi.
  const schedDateSet = scheduledDateSet(scheduled)

  const isWeek = view === 'week'

  return (
    <div className="card p-3 sm:p-4">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {t.cal.weekdaysShort.map(d => (
          <div
            key={d}
            className="text-center py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-7 gap-0.5 ${isWeek ? 'gap-y-0' : ''}`}>
        {days.map(date => {
          const inMonth = date.startsWith(month)
          const isToday = date === today
          const isSelected = date === selectedDate
          const isFuture = date > today
          const finished = finishedSet.has(date)
          const hasEntry = hasEntrySet.has(date)
          const taskCount = taskCountByDate[date] ?? 0
          const hasAppt = apptDateSet.has(date)
          const hasScheduled = schedDateSet.has(date)
          const dayNum = parseInt(date.split('-')[2], 10)

          const isActiveDate = isSelected || isToday

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              aria-label={date}
              aria-pressed={isSelected}
              className={[
                'relative flex flex-col items-center rounded-[var(--r-md)] transition-colors select-none',
                isWeek ? 'py-5 gap-2.5' : 'py-1.5 gap-1',
                !inMonth && !isWeek ? 'opacity-30' : '',
              ].join(' ')}
              style={{
                background: isSelected
                  ? 'var(--gold-tint)'
                  : 'transparent',
                outline: isToday ? '1.5px solid var(--gold)' : 'none',
                outlineOffset: '-1px',
              }}
            >
              {/* Date number */}
              <span
                className={[
                  'flex items-center justify-center rounded-full font-semibold leading-none transition-colors',
                  isWeek ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs',
                ].join(' ')}
                style={{
                  background: isToday && isSelected ? 'var(--gold)' : 'transparent',
                  color: isToday && isSelected
                    ? '#fff'
                    : isToday
                    ? 'var(--gold)'
                    : isSelected
                    ? 'var(--gold)'
                    : inMonth || isWeek
                    ? 'var(--text)'
                    : 'var(--text-muted)',
                  fontWeight: isActiveDate ? 700 : 500,
                }}
              >
                {dayNum}
              </span>

              {/* Finished checkmark */}
              {finished && (
                <span
                  className="absolute top-0.5 right-1 text-[0.5rem] leading-none font-bold"
                  style={{ color: 'var(--gold)' }}
                >✓</span>
              )}

              {/* Event dots */}
              <div className="flex items-center justify-center gap-0.5 min-h-[6px]">
                {(taskCount > 0 || hasEntry) && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: hasEntry ? 'var(--gold)' : 'var(--text-muted)' }}
                  />
                )}
                {hasAppt && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f97316' }} />
                )}
                {hasScheduled && !hasEntry && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isFuture ? '#60a5fa' : 'var(--text-muted)' }}
                  />
                )}
              </div>

              {/* Week view labels */}
              {isWeek && (
                <div className="flex flex-col items-center gap-0.5">
                  {taskCount > 0 && (
                    <div className="text-[0.58rem] font-medium leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {t.cal.tasksAbbr(taskCount)}
                    </div>
                  )}
                  {hasAppt && (
                    <div className="text-[0.58rem] font-medium leading-tight" style={{ color: '#f97316' }}>
                      {t.cal.apptAbbr}
                    </div>
                  )}
                  {hasScheduled && !hasEntry && (
                    <div className="text-[0.58rem] font-medium leading-tight" style={{ color: '#60a5fa' }}>
                      {t.cal.scheduledAbbr}
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
          <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.cal.legendTasks}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#f97316' }} />
          <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.cal.legendAppts}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#60a5fa' }} />
          <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.cal.legendScheduled}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.58rem] font-bold leading-none" style={{ color: 'var(--gold)' }}>✓</span>
          <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.cal.legendDone}</span>
        </div>
      </div>
    </div>
  )
}
