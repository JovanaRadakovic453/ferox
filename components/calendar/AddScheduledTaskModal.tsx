'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

type ScheduledTask = {
  id: string
  for_date: string
  name: string
  priority: string
  note: string
  remind_before_minutes: number | null
  deadline_date: string | null
}

export default function AddScheduledTaskModal({
  open,
  onClose,
  onAdd,
  date,
  zones = [],
}: {
  open: boolean
  onClose: () => void
  onAdd: (task: ScheduledTask) => void
  date: string
  zones?: { id: string; name: string; icon: string }[]
}) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [reminderValue, setReminderValue] = useState(1)
  const [reminderUnit, setReminderUnit] = useState<'dana' | 'sati' | 'minuta'>('dana')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState(date)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setPriority('medium')
      setZoneId(null)
      setReminderValue(1)
      setReminderUnit('dana')
      setReminderEnabled(false)
      setDeadlineEnabled(false)
      setDeadlineDate(date)
      setSubmitting(false)
      setError(null)
    }
  }, [open, date])

  const remind_before_minutes = reminderEnabled
    ? reminderUnit === 'dana'
      ? reminderValue * 24 * 60
      : reminderUnit === 'sati'
      ? reminderValue * 60
      : reminderValue
    : null

  async function submit() {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          priority,
          for_date: date,
          remind_before_minutes,
          deadline_date: deadlineEnabled ? deadlineDate : null,
          zone_id: zoneId,
          note: '',
        }),
      })
      if (!res.ok) {
        setError('Zadatak nije sačuvan — pokušaj ponovo')
        return
      }
      const data = await res.json()
      onAdd(data)
      onClose()
    } catch {
      setError('Greška pri čuvanju — pokušaj ponovo')
    } finally {
      setSubmitting(false)
    }
  }

  const formatted = new Intl.DateTimeFormat('sr-Latn-RS', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))

  return (
    <Modal open={open} onClose={onClose} titleId="add-sched-title">
      <div className="flex items-center justify-between">
        <div>
          <h3 id="add-sched-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
            Novi zadatak
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatted}</p>
        </div>
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
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
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

      {zones.length > 0 && (
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Oblast</label>
          <select
            value={zoneId ?? ''}
            onChange={e => setZoneId(e.target.value || null)}
            className="field field-select h-11 px-2 text-sm"
          >
            <option value="">— Bez oblasti</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.icon} {z.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Podsetnik toggle + unos */}
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

      {/* Rok (deadline) toggle + datum */}
      <div>
        <button
          type="button"
          onClick={() => setDeadlineEnabled(p => !p)}
          className="flex items-center justify-between w-full px-3.5 py-3 rounded-[var(--r-md)] border text-sm transition-colors"
          style={{
            background: deadlineEnabled ? 'var(--gold-tint)' : 'var(--surface2)',
            borderColor: deadlineEnabled ? 'var(--gold)' : 'var(--border)',
          }}
        >
          <span style={{ color: 'var(--text)' }}>📅 Rok</span>
          <div
            className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
            style={{
              background: deadlineEnabled ? 'var(--gold)' : 'var(--border)',
              justifyContent: deadlineEnabled ? 'flex-end' : 'flex-start',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
        </button>

        {deadlineEnabled && (
          <div className="mt-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Do kada?</label>
            <input
              type="date"
              value={deadlineDate}
              min={date}
              onChange={e => setDeadlineDate(e.target.value)}
              className="field h-11 px-3 text-sm w-full"
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <Button size="md" className="w-full" onClick={submit} loading={submitting} disabled={!name.trim()}>
        Dodaj zadatak
      </Button>
    </Modal>
  )
}
