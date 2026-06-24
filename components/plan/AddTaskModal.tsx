'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { TaskType, Priority } from '@/types/ferox'

// Dodavanje zadatka ili termina. Forma drži sopstveno stanje; roditelj radi
// DB upis preko onAddTask/onAddAppointment (vraćaju true na uspeh).
export default function AddTaskModal({
  open, onClose, onAddTask, onAddAppointment,
}: {
  open: boolean
  onClose: () => void
  onAddTask: (t: { name: string; type: TaskType; priority: Priority }) => Promise<boolean>
  onAddAppointment: (a: { name: string; time: string }) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TaskType>('light')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isAppt, setIsAppt] = useState(false)
  const [time, setTime] = useState('09:00')
  const [submitting, setSubmitting] = useState(false)

  // Reset forme svaki put kad se modal otvori (čista forma pri svakom otvaranju).
  useEffect(() => {
    if (open) {
      setName(''); setType('light'); setPriority('medium'); setIsAppt(false); setTime('09:00'); setSubmitting(false)
    }
  }, [open])

  async function submit() {
    if (!name.trim()) return
    setSubmitting(true)
    const ok = isAppt
      ? await onAddAppointment({ name: name.trim(), time })
      : await onAddTask({ name: name.trim(), type, priority })
    setSubmitting(false)
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} titleId="add-task-title">
      <div className="flex items-center justify-between">
        <h3 id="add-task-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          {isAppt ? 'Novi termin' : 'Novi zadatak'}
        </h3>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <input
        data-autofocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !isAppt) submit() }}
        placeholder={isAppt ? 'Naziv termina...' : 'Naziv zadatka...'}
        className="field h-12 px-3.5 text-sm"
      />

      <button
        onClick={() => setIsAppt(p => !p)}
        className="flex items-center justify-between w-full px-3.5 py-3 rounded-[var(--r-md)] border text-sm transition-colors"
        style={{
          background: isAppt ? 'var(--gold-tint)' : 'var(--surface2)',
          borderColor: isAppt ? 'var(--gold)' : 'var(--border)',
        }}
      >
        <span style={{ color: 'var(--text)' }}>🗓️ Zakazan termin</span>
        <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
          style={{ background: isAppt ? 'var(--gold)' : 'var(--border)', justifyContent: isAppt ? 'flex-end' : 'flex-start' }}>
          <div className="w-4 h-4 rounded-full bg-white" />
        </div>
      </button>

      {isAppt ? (
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Vreme termina</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="field h-12 px-3.5 text-sm" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tip</label>
            <select value={type} onChange={e => setType(e.target.value as TaskType)} className="field field-select h-11 px-2 text-sm">
              {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="field field-select h-11 px-2 text-sm">
              <option value="high">🔴 Visok</option>
              <option value="medium">🟡 Srednji</option>
              <option value="low">🟢 Nizak</option>
            </select>
          </div>
        </div>
      )}

      <Button size="md" className="w-full" onClick={submit} loading={submitting} disabled={!name.trim()}>
        {isAppt ? 'Dodaj termin' : 'Dodaj zadatak'}
      </Button>
    </Modal>
  )
}
