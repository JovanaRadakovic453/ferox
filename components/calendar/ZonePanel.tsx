'use client'

import { useState } from 'react'
import EditScheduledTaskModal from './EditScheduledTaskModal'

type Appointment = { id: string; date_key: string; name: string; time: string; done: boolean; zone_id?: string | null }
type ScheduledTask = { id: string; for_date: string; name: string; priority: string; note: string; remind_before_minutes: number | null; deadline_date: string | null; zone_id?: string | null }
type Zone = { id: string; name: string; icon: string; position: number }

const PRIORITY_DOT: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}

export default function ZonePanel({
  zone,
  scheduled,
  appointments,
  today,
  onUpdateTask,
  onDeleteTask,
}: {
  zone: Zone
  scheduled: ScheduledTask[]
  appointments: Appointment[]
  today: string
  onUpdateTask: (updated: ScheduledTask) => void
  onDeleteTask: (id: string) => void
}) {
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const futureScheduled = scheduled.filter(t => t.for_date >= today)
  const futureAppointments = appointments.filter(a => a.date_key >= today)

  const dateKeys = Array.from(new Set([
    ...futureScheduled.map(t => t.for_date),
    ...futureAppointments.map(a => a.date_key),
  ])).sort()

  const total = futureScheduled.length + futureAppointments.length

  return (
    <div
      className="card flex flex-col gap-4 p-5 lg:sticky lg:top-4 overflow-y-auto"
      style={{ minHeight: 200, maxHeight: 'calc(100vh - 8rem)' }}
    >
      <div>
        <div
          className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Oblast
        </div>
        <h2 className="title-serif text-[1.1rem] leading-tight" style={{ color: 'var(--text)' }}>
          {zone.icon} {zone.name}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {total === 0
            ? 'Nema nadolazećih stavki.'
            : `${total} ${total === 1 ? 'stavka' : total < 5 ? 'stavke' : 'stavki'} u narednom periodu`}
        </p>
      </div>

      {dateKeys.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Dodaj zadatke ili termine u ovu oblast da bi se ovde prikazali.
        </p>
      )}

      {dateKeys.map(dateKey => {
        const dayAppts = futureAppointments
          .filter(a => a.date_key === dateKey)
          .sort((a, b) => a.time.localeCompare(b.time))
        const dayTasks = futureScheduled
          .filter(t => t.for_date === dateKey)
          .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))

        return (
          <section key={dateKey}>
            <div className="section-label mb-2">{formatDateLabel(dateKey)}</div>
            <div className="flex flex-col gap-1.5">
              {dayAppts.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)]"
                  style={{ background: 'var(--surface2)' }}
                >
                  <span
                    className="text-xs font-mono font-semibold shrink-0 tabular-nums"
                    style={{ color: 'var(--gold)' }}
                  >
                    {a.time}
                  </span>
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    style={{ color: 'var(--text)', opacity: a.done ? 0.5 : 1 }}
                  >
                    {a.name}
                  </span>
                </div>
              ))}
              {dayTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)] group"
                  style={{ background: 'var(--surface2)' }}
                >
                  <span className="text-xs shrink-0">{PRIORITY_DOT[t.priority] ?? '🟡'}</span>
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    style={{ color: 'var(--text)' }}
                  >
                    {t.name}
                  </span>
                  <button
                    onClick={() => setEditingTask(t)}
                    className="text-xs shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Izmeni ${t.name}`}
                  >
                    ✎
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
      <EditScheduledTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={updated => { onUpdateTask(updated); setEditingTask(null) }}
        onDelete={id => { onDeleteTask(id); setEditingTask(null) }}
      />
    </div>
  )
}
