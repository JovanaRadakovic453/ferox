'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AddScheduledTaskModal from './AddScheduledTaskModal'
import EditScheduledTaskModal from './EditScheduledTaskModal'

type Entry = { id: string; date_key: string; finished_at: string | null }
type Appointment = { id: string; date_key: string; name: string; time: string; done: boolean }
type ScheduledTask = { id: string; for_date: string; name: string; priority: string; note: string; remind_before_minutes: number | null; deadline_date: string | null }
type LoadedTask = { id: string; name: string; priority: string; done: boolean; note: string }

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_DOT: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }

function formatDeadlineDate(dateKey: string, today: string): string {
  const [todayYear] = today.split('-').map(Number)
  const [dlYear] = dateKey.split('-').map(Number)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  if (dlYear !== todayYear) opts.year = 'numeric'
  return new Intl.DateTimeFormat('sr-Latn-RS', opts).format(new Date(`${dateKey}T12:00:00Z`))
}

function getDeadlineBadge(deadlineDate: string, today: string): { text: string; color: string } {
  if (deadlineDate < today) {
    return { text: `Rok: ${formatDeadlineDate(deadlineDate, today)}`, color: 'var(--danger)' }
  }
  if (deadlineDate === today) {
    return { text: 'Rok: danas', color: 'var(--warn)' }
  }
  const diffMs = new Date(`${deadlineDate}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (days === 1) return { text: 'Rok: sutra', color: '#f97316' }
  if (days <= 7) return { text: `Rok: ${formatDeadlineDate(deadlineDate, today)}`, color: '#f97316' }
  return { text: `Rok: ${formatDeadlineDate(deadlineDate, today)}`, color: 'var(--text-muted)' }
}

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
  onUpdateTask,
  googleConnected = false,
}: {
  date: string
  today: string
  entries: Entry[]
  appointments: Appointment[]
  scheduled: ScheduledTask[]
  onAddTask: (task: ScheduledTask) => void
  onRemoveTask: (id: string) => void
  onUpdateTask: (updated: ScheduledTask) => void
  googleConnected?: boolean
}) {
  const entry = entries.find(e => e.date_key === date)
  const isFuture = date > today
  const isToday = date === today

  const [tasks, setTasks] = useState<LoadedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [googleEvents, setGoogleEvents] = useState<{ id: string; title: string; time: string | null; endTime: string | null }[]>([])

  // Fetch Google Calendar events for the selected day (read-only prikaz).
  useEffect(() => {
    setGoogleEvents([])
    if (!googleConnected) return
    fetch(`/api/integrations/google/events?date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.events?.length) setGoogleEvents(json.events) })
      .catch(() => {})
  }, [date, googleConnected])

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
  }, [entry?.id, entry?.finished_at])

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

  function handleUpdate(updated: ScheduledTask) {
    onUpdateTask(updated)
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

      {/* Google Calendar events (read-only) */}
      {googleEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="section-label">Google Kalendar</div>
          </div>
          <div className="flex flex-col gap-1.5">
            {googleEvents.map(ev => (
              <div
                key={ev.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)]"
                style={{ background: 'var(--surface2)' }}
              >
                <span className="text-xs font-mono font-semibold shrink-0 tabular-nums" style={{ color: 'var(--gold)' }}>
                  {ev.time ?? '—'}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text)' }}>
                  {ev.title}
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

      {/* Future + today: scheduled tasks */}
      {(isFuture || isToday) && (
        <section>
          <div className="section-label mb-2">Zakazani zadaci</div>
          {sortedScheduled.length === 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Nema zakazanih zadataka za ovaj dan.
            </p>
          )}
          {sortedScheduled.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {sortedScheduled.map(t => {
                const dlBadge = t.deadline_date ? getDeadlineBadge(t.deadline_date, today) : null
                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 px-3 py-2 rounded-[var(--r-md)] group"
                    style={{ background: 'var(--surface2)' }}
                  >
                    <span className="text-xs shrink-0 mt-0.5">{PRIORITY_DOT[t.priority] ?? '🟡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{t.name}</div>
                      {dlBadge && (
                        <div className="flex items-center gap-0.5 text-[0.58rem] font-semibold mt-0.5" style={{ color: dlBadge.color }}>
                          <span>▲</span><span>{dlBadge.text}</span>
                        </div>
                      )}
                    </div>
                    {t.remind_before_minutes != null && (
                      <span className="text-[0.58rem] font-semibold shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        🔔{t.remind_before_minutes >= 1440
                          ? `${Math.round(t.remind_before_minutes / 1440)}d`
                          : t.remind_before_minutes >= 60
                          ? `${Math.round(t.remind_before_minutes / 60)}h`
                          : `${t.remind_before_minutes}min`}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTask(t)}
                        className="text-xs hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label={`Izmeni ${t.name}`}
                      >✎</button>
                      <button
                        onClick={() => handleRemove(t.id)}
                        disabled={removing === t.id}
                        className="text-xs hover:opacity-70 transition-opacity disabled:opacity-30"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label={`Obriši ${t.name}`}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {sortedScheduled.some(t => t.deadline_date) && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-[0.55rem] font-semibold uppercase tracking-wide shrink-0" style={{ color: 'var(--text-muted)' }}>Rok:</span>
              <div className="flex items-center gap-1 text-[0.58rem] font-semibold" style={{ color: 'var(--danger)' }}>
                <span>▲</span><span>prošao</span>
              </div>
              <div className="flex items-center gap-1 text-[0.58rem] font-semibold" style={{ color: 'var(--warn)' }}>
                <span>▲</span><span>uskoro</span>
              </div>
              <div className="flex items-center gap-1 text-[0.58rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span>▲</span><span>daleko</span>
              </div>
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

      <EditScheduledTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={updated => { handleUpdate(updated); setEditingTask(null) }}
        onDelete={id => { onRemoveTask(id); setEditingTask(null) }}
      />
    </div>
  )
}
