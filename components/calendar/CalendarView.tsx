'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarGrid from './CalendarGrid'
import DayPanel from './DayPanel'
import ZonePanel from './ZonePanel'

type Entry = { id: string; date_key: string; finished_at: string | null }
type Appointment = { id: string; date_key: string; name: string; time: string; done: boolean; zone_id?: string | null }
type ScheduledTask = { id: string; for_date: string; name: string; priority: string; note: string; remind_before_minutes: number | null; deadline_date: string | null; zone_id?: string | null }
type Zone = { id: string; name: string; icon: string; position: number }

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
]

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function CalendarView({
  initialMonth,
  today,
  entries,
  taskCountByDate,
  appointments,
  scheduled,
  zones = [],
}: {
  initialMonth: string
  today: string
  entries: Entry[]
  taskCountByDate: Record<string, number>
  appointments: Appointment[]
  scheduled: ScheduledTask[]
  zones?: Zone[]
}) {
  const router = useRouter()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  // Optimistic list — updated immediately on add/remove without waiting for re-fetch
  const [panelScheduled, setPanelScheduled] = useState<ScheduledTask[]>(scheduled)

  const [year, monthNum] = initialMonth.split('-').map(Number)
  const monthName = MONTH_NAMES[monthNum - 1]

  function navMonth(delta: number) {
    router.push(`/calendar?month=${shiftMonth(initialMonth, delta)}`)
  }

  function addTask(task: ScheduledTask) {
    setPanelScheduled(prev => [...prev, task])
  }

  function removeTask(id: string) {
    setPanelScheduled(prev => prev.filter(t => t.id !== id))
  }

  function updateTask(updated: ScheduledTask) {
    setPanelScheduled(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const filteredScheduled = selectedZoneId
    ? panelScheduled.filter(t => t.zone_id === selectedZoneId)
    : panelScheduled

  const filteredAppointments = selectedZoneId
    ? appointments.filter(a => a.zone_id === selectedZoneId)
    : appointments

  return (
    <main className="flex flex-col gap-5 pb-2">
      {/* Header: month nav + view toggle */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--r-md)] transition-colors text-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--surface2)' }}
            aria-label="Prethodni mesec"
          >‹</button>
          <h1 className="display foil text-2xl lg:text-3xl whitespace-nowrap">
            {monthName} {year}
          </h1>
          <button
            onClick={() => navMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--r-md)] transition-colors text-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--surface2)' }}
            aria-label="Sledeći mesec"
          >›</button>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-[var(--r-md)] p-0.5" style={{ background: 'var(--surface2)' }}>
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--r-md)-2px)] transition-all"
              style={{
                background: view === v ? 'var(--gold)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-muted)',
              }}
            >
              {v === 'month' ? 'Mesec' : 'Nedelja'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter po oblastima */}
      {zones.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedZoneId(null)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: selectedZoneId === null ? 'var(--gold)' : 'var(--surface2)',
              color: selectedZoneId === null ? '#fff' : 'var(--text-muted)',
            }}
          >
            Sve
          </button>
          {zones.map(z => (
            <button
              key={z.id}
              onClick={() => setSelectedZoneId(prev => prev === z.id ? null : z.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: selectedZoneId === z.id ? 'var(--gold)' : 'var(--surface2)',
                color: selectedZoneId === z.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {z.icon} {z.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid + panel side by side on desktop */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px] lg:gap-5 lg:items-start">
        <CalendarGrid
          view={view}
          month={initialMonth}
          today={today}
          entries={entries}
          taskCountByDate={taskCountByDate}
          appointments={filteredAppointments}
          scheduled={filteredScheduled}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {selectedZoneId ? (
          <ZonePanel
            zone={zones.find(z => z.id === selectedZoneId)!}
            scheduled={filteredScheduled}
            appointments={filteredAppointments}
            today={today}
            onUpdateTask={updateTask}
            onDeleteTask={removeTask}
          />
        ) : (
          <DayPanel
            date={selectedDate}
            today={today}
            entries={entries}
            appointments={filteredAppointments.filter(a => a.date_key === selectedDate)}
            scheduled={filteredScheduled.filter(t => t.for_date === selectedDate)}
            onAddTask={addTask}
            onRemoveTask={removeTask}
            onUpdateTask={updateTask}
            zones={zones}
            selectedZoneId={selectedZoneId}
          />
        )}
      </div>
    </main>
  )
}
