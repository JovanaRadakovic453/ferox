'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import WhenFields from '@/components/calendar/WhenFields'

type ScheduledTask = {
  id: string
  for_date: string
  name: string
  priority: string
  note: string
  remind_before_minutes: number | null
  deadline_date: string | null
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
}: {
  task: ScheduledTask | null
  onClose: () => void
  onUpdate: (updated: ScheduledTask) => void
  onDelete: (id: string) => void
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
      if (!res.ok) { setError('Nije sačuvano — pokušaj ponovo'); return }
      const data = await res.json()
      onUpdate({ ...task, ...data })
      onClose()
    } catch {
      setError('Greška mreže — pokušaj ponovo')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Brisanje nije uspelo — pokušaj ponovo'); setDeleting(false); return }
      onDelete(task.id)
      onClose()
    } catch {
      setError('Greška mreže — pokušaj ponovo')
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} titleId="edit-sched-title">
      <div className="flex items-center justify-between">
        <h3 id="edit-sched-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          Izmeni zadatak
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
        placeholder="Naziv zadatka..."
        className="field h-12 px-3.5 text-sm"
      />

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="field field-select h-11 px-2 text-sm"
        >
          <option value="high">🔴 Visok</option>
          <option value="medium">🟡 Srednji</option>
          <option value="low">🟢 Nizak</option>
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
          <span style={{ color: 'var(--text)' }}>🔔 Podsetnik</span>
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
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Koliko ranije?</label>
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
                <option value="dana">dan/a</option>
                <option value="sati">sat/i</option>
                <option value="minuta">minut/a</option>
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
        Sačuvaj izmene
      </Button>

      <button
        onClick={remove}
        disabled={deleting}
        className="w-full py-2.5 text-sm font-medium rounded-[var(--r-md)] transition-colors disabled:opacity-50"
        style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
      >
        {deleting ? 'Brišem...' : '🗑️ Obriši zadatak'}
      </button>
    </Modal>
  )
}
