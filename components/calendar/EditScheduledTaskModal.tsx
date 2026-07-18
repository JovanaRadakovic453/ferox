'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import WhenFields from '@/components/calendar/WhenFields'
import { useT } from '@/components/i18n/I18nProvider'

type ScheduledTask = {
  id: string
  for_date: string
  name: string
  priority: string
  note: string
  remind_before_minutes: number | null
  deadline_date: string | null
  /** Postoji ako je zadatak pojavljivanje serije koja se ponavlja. */
  repeat_id?: string | null
}

function initReminder(mins: number | null): { enabled: boolean; value: number; unit: 'dana' | 'sati' | 'minuta' } {
  if (!mins) return { enabled: false, value: 1, unit: 'dana' }
  if (mins >= 1440) return { enabled: true, value: Math.round(mins / 1440), unit: 'dana' }
  if (mins >= 60) return { enabled: true, value: Math.round(mins / 60), unit: 'sati' }
  return { enabled: true, value: mins, unit: 'minuta' }
}

export default function EditScheduledTaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  onSeriesDeleted,
}: {
  task: ScheduledTask | null
  onClose: () => void
  onUpdate: (updated: ScheduledTask) => void
  onDelete: (id: string) => void
  /** Cela serija je zaustavljena — traži pun osvežaj (menja više dana). */
  onSeriesDeleted?: () => void
}) {
  const open = task !== null

  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderValue, setReminderValue] = useState(1)
  const [reminderUnit, setReminderUnit] = useState<'dana' | 'sati' | 'minuta'>('dana')
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  useEffect(() => {
    if (task) {
      setName(task.name)
      setPriority(task.priority)
      const r = initReminder(task.remind_before_minutes)
      setReminderEnabled(r.enabled)
      setReminderValue(r.value)
      setReminderUnit(r.unit)
      setDeadlineEnabled(!!task.deadline_date)
      setDeadlineDate(task.deadline_date ?? task.for_date)
      setError(null)
      setSaving(false)
      setDeleting(false)
    }
  }, [task])

  const remind_before_minutes = reminderEnabled
    ? reminderUnit === 'dana' ? reminderValue * 1440
    : reminderUnit === 'sati' ? reminderValue * 60
    : reminderValue
    : null

  async function save() {
    if (!task || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          priority,
          note: task.note ?? '',
          remind_before_minutes,
          deadline_date: deadlineEnabled ? deadlineDate : null,
        }),
      })
      if (!res.ok) { setError(t.sched.notSaved); return }
      const data = await res.json()
      onUpdate({ ...task, ...data })
      onClose()
    } catch {
      setError(t.sched.networkError)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) { setError(t.sched.deleteFailed); setDeleting(false); return }
      onDelete(task.id)
      onClose()
    } catch {
      setError(t.sched.networkError)
      setDeleting(false)
    }
  }

  // Zaustavlja celu seriju. Server briše samo buduća, nezavršena pojavljivanja —
  // istorija ostaje. Menja više dana odjednom, pa traži pun osvežaj ekrana.
  async function removeSeries() {
    if (!task?.repeat_id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/task-repeats/${task.repeat_id}`, { method: 'DELETE' })
      if (!res.ok) { setError(t.sched.deleteFailed); setDeleting(false); return }
      onSeriesDeleted?.()
      onClose()
    } catch {
      setError(t.sched.networkError)
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} titleId="edit-sched-title">
      <div className="flex items-center justify-between">
        <h3 id="edit-sched-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          {t.sched.editTask}
        </h3>
        <button
          onClick={onClose}
          className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >✕</button>
      </div>

      <input
        data-autofocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save() }}
        placeholder={t.sched.taskName}
        className="field h-12 px-3.5 text-sm"
      />

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.sched.priorityLabel}</label>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="field field-select h-11 px-2 text-sm"
        >
          <option value="high">{t.priority.high}</option>
          <option value="medium">{t.priority.medium}</option>
          <option value="low">{t.priority.low}</option>
        </select>
      </div>

      {/* Podsetnik */}
      <div>
        <button
          type="button"
          onClick={() => setReminderEnabled(p => !p)}
          className="flex items-center justify-between w-full px-3.5 py-3 rounded-[var(--r-md)] border text-sm transition-colors"
          style={{
            background: reminderEnabled ? 'var(--gold-tint)' : 'var(--surface2)',
            borderColor: reminderEnabled ? 'var(--gold)' : 'var(--border)',
          }}
        >
          <span style={{ color: 'var(--text)' }}>{t.sched.reminder}</span>
          <div
            className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
            style={{
              background: reminderEnabled ? 'var(--gold)' : 'var(--border)',
              justifyContent: reminderEnabled ? 'flex-end' : 'flex-start',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
        </button>
        {reminderEnabled && (
          <div className="mt-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.sched.howEarly}</label>
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input
                type="number"
                min={1}
                max={999}
                value={reminderValue}
                onChange={e => setReminderValue(Math.max(1, Number(e.target.value)))}
                className="field h-11 px-3 text-sm text-center"
              />
              <select
                value={reminderUnit}
                onChange={e => setReminderUnit(e.target.value as 'dana' | 'sati' | 'minuta')}
                className="field field-select h-11 px-3 text-sm w-28"
              >
                <option value="dana">{t.sched.unitDays}</option>
                <option value="sati">{t.sched.unitHours}</option>
                <option value="minuta">{t.sched.unitMinutes}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* task je null dok je forma zatvorena — Modal se i tad iscrtava, pa čuvamo pristup */}
      {task && (
        <WhenFields
          startDate={task.for_date}
          deadlineEnabled={deadlineEnabled}
          onToggleDeadline={() => setDeadlineEnabled(p => !p)}
          deadlineDate={deadlineDate}
          onDeadlineChange={setDeadlineDate}
        />
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <Button size="md" className="w-full" onClick={save} loading={saving} disabled={!name.trim()}>
        {t.sched.saveChanges}
      </Button>

      {task?.repeat_id && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            🔁 {t.sched.repeatSeriesNote}
          </p>
          <button
            onClick={removeSeries}
            disabled={deleting}
            className="w-full py-2.5 text-sm font-medium rounded-[var(--r-md)] transition-colors disabled:opacity-50"
            style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
          >
            {t.sched.repeatDeleteSeries}
          </button>
        </div>
      )}

      <button
        onClick={remove}
        disabled={deleting}
        className="w-full py-2.5 text-sm font-medium rounded-[var(--r-md)] transition-colors disabled:opacity-50"
        style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
      >
        {deleting ? t.sched.deleting : task?.repeat_id ? t.sched.repeatDeleteOne : t.sched.deleteTask}
      </button>
    </Modal>
  )
}
