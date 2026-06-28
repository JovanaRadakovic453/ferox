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
  remind_before: string | null
}

export default function AddScheduledTaskModal({
  open,
  onClose,
  onAdd,
  date,
}: {
  open: boolean
  onClose: () => void
  onAdd: (task: ScheduledTask) => void
  date: string
}) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [remindBefore, setRemindBefore] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setPriority('medium')
      setRemindBefore('')
      setSubmitting(false)
      setError(null)
    }
  }, [open])

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
          remind_before: remindBefore || null,
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

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Podsetnik</label>
        <select
          value={remindBefore}
          onChange={e => setRemindBefore(e.target.value)}
          className="field field-select h-11 px-2 text-sm"
        >
          <option value="">Bez podsetnika</option>
          <option value="day_before">🔔 Dan ranije</option>
          <option value="morning">🌅 Ujutru tog dana</option>
        </select>
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}

      <Button size="md" className="w-full" onClick={submit} loading={submitting} disabled={!name.trim()}>
        Dodaj zadatak
      </Button>
    </Modal>
  )
}
