'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AddScheduledTaskModal from './AddScheduledTaskModal'

type Entry = { id: string; date_key: string; finished_at: string | null }
type Appointment = { id: string; date_key: string; name: string; time: string; done: boolean }
type ScheduledTask = { id: string; for_date: string; name: string; priority: string; note: string; remind_before: string | null }
type LoadedTask = { id: string; name: string; priority: string; done: boolean; note: string }

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_DOT: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}

function sortByPriority<T extends { priority: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))
}

export default function DayPanel({
  date,
  today,
  entries,
  appointments,
  scheduled,
  onAddTask,
  onRemoveTask,
}: {
  date: string
  today: string
  entries: Entry[]
  appointments: Appointment[]
  scheduled: ScheduledTask[]
  onAddTask: (task: ScheduledTask) => void
  onRemoveTask: (id: string) => void
}) {
  const entry = entries.find(e => e.date_key === date)
  const isFuture = date > today
  const isToday = date === today

  const [tasks, setTasks] = useState<LoadedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  // Fetch actual tasks for past/today entries
  useEffect(() => {
    setTasks([])
    if (!entry) return
    setLoadingTasks(true)
    const supabase = createClient()
    supabase
      .from('tasks')
      .select('id, name, priority, done, note')
      .eq('entry_id', entry.id)
      .order('position')
      .then(({ data }) => {
        setTasks((data ?? []) as LoadedTask[])
        setLoadingTasks(false)
      })
  }, [entry?.id])

  const sortedAppts = [...appointments].sort((a, b) => a.time.localeCompare(b.time))
  const sortedScheduled = sortByPriority(scheduled)
  const sortedTasks = sortByPriority(tasks)

  async function handleRemove(id: string) {
    setRemoving(id)
    try {
      const res = await fetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' })
      if (res.ok) onRemoveTask(id)
    } finally {
      setRemoving(null)
    }
  }

  const dayLabel = isToday ? 'Danas' : isFuture ? 'Budući datum' : 'Prošli datum'

  return (
    <div
      className="card flex flex-col gap-5 p-5 lg:sticky lg:top-4"
      style={{ minHeight: 200 }}
    >
      {/* Header */}
      <div>
        <div
          className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {dayLabel}
        </div>
        <h2 className="title-serif text-[1.1rem] leading-tight" style={{ color: 'var(--text)' }}>
          {formatDateLabel(date)}
        </h2>
        {entry?.finished_at && (
          <span className="inline-flex items-center gap-1 text-xs mt-1 font-medium" style={{ color: 'var(--gold)' }}>
            ✓ Dan završen
          </span>
        )}
      </div>

      {/* Appointments */}
      {sortedAppts.length > 0 && (
        <section>
          <div className="section-label mb-2">Termini</div>
          <div className="flex flex-col gap-1.5">
            {sortedAppts.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)]"
                style={{ background: 'var(--surface2)' }}
              >
                <span className="text-xs font-mono font-semibold shrink-0 tabular-nums" style={{ color: 'var(--gold)' }}>
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
          </div>
        </section>
      )}

      {/* Past / today: tasks from day_entry */}
      {!isFuture && (
        <section>
          <div className="section-label mb-2">Zadaci</div>
          {loadingTasks && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Učitavam...</p>
          )}
          {!loadingTasks && !entry && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Za ovaj datum nije kreiran plan.
            </p>
          )}
          {!loadingTasks && entry && sortedTasks.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nema zadataka za ovaj dan.</p>
          )}
          {!loadingTasks && sortedTasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {sortedTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)]"
                  style={{ background: 'var(--surface2)' }}
                >
                  <span className="text-xs shrink-0">{PRIORITY_DOT[t.priority] ?? '🟡'}</span>
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    style={{
                      color: 'var(--text)',
                      opacity: t.done ? 0.5 : 1,
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}
                  >
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Future: scheduled tasks */}
      {isFuture && (
        <section>
          <div className="section-label mb-2">Zakazani zadaci</div>
          {sortedScheduled.length === 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Nema zakazanih zadataka za ovaj dan.
            </p>
          )}
          {sortedScheduled.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {sortedScheduled.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] group"
                  style={{ background: 'var(--surface2)' }}
                >
                  <span className="text-xs shrink-0">{PRIORITY_DOT[t.priority] ?? '🟡'}</span>
                  <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text)' }}>
                    {t.name}
                  </span>
                  {t.remind_before && (
                    <span className="text-[0.58rem] font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {t.remind_before === 'day_before' ? '🔔-1d' : '🔔ujutru'}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(t.id)}
                    disabled={removing === t.id}
                    className="text-xs opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity shrink-0 disabled:opacity-30"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Obriši ${t.name}`}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-[var(--r-md)] border text-sm font-medium transition-colors"
            style={{
              borderColor: 'var(--gold)',
              borderStyle: 'dashed',
              color: 'var(--gold)',
              background: 'var(--gold-tint)',
            }}
          >
            + Dodaj zadatak
          </button>
        </section>
      )}

      {/* Link to plan for past/today */}
      {!isFuture && (
        <Link
          href={isToday ? '/plan' : `/plan?date=${date}`}
          className="flex items-center justify-center gap-1.5 h-9 rounded-[var(--r-md)] text-sm font-medium transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}
        >
          {isToday ? 'Idi na plan →' : 'Pogledaj plan →'}
        </Link>
      )}

      <AddScheduledTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={task => { onAddTask(task); setAddOpen(false) }}
        date={date}
      />
    </div>
  )
}
