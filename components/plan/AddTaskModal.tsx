'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import type { TaskType, Priority } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'
import { useT } from '@/components/i18n/I18nProvider'

// Dodavanje zadatka ili termina. Forma drži sopstveno stanje; roditelj radi
// DB upis preko onAddTask/onAddAppointment (vraćaju true na uspeh).
export default function AddTaskModal({
  open, onClose, onAddTask, onAddAppointment,
}: {
  open: boolean
  onClose: () => void
  onAddTask: (t: { name: string; type: TaskType; priority: Priority; note: string }) => Promise<boolean>
  onAddAppointment: (a: { name: string; time: string; reminder: number }) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState<TaskType>('light')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isAppt, setIsAppt] = useState(false)
  const [time, setTime] = useState('09:00')
  const [reminderValue, setReminderValue] = useState(DEFAULTS.reminderMinutes)
  const [reminderUnit, setReminderUnit] = useState<'min' | 'sat'>('min')
  const [submitting, setSubmitting] = useState(false)
  const t = useT()

  // Reset forme svaki put kad se modal otvori (čista forma pri svakom otvaranju).
  useEffect(() => {
    if (open) {
      setName(''); setNote(''); setType('light'); setPriority('medium'); setIsAppt(false); setTime('09:00')
      setReminderValue(DEFAULTS.reminderMinutes); setReminderUnit('min'); setSubmitting(false)
    }
  }, [open])

  async function submit() {
    if (!name.trim()) return
    setSubmitting(true)
    const reminder = reminderUnit === 'sat' ? reminderValue * 60 : reminderValue
    const ok = isAppt
      ? await onAddAppointment({ name: name.trim(), time, reminder })
      : await onAddTask({ name: name.trim(), type, priority, note: note.trim() })
    setSubmitting(false)
    if (ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} titleId="add-task-title">
      <div className="flex items-center justify-between">
        <h3 id="add-task-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          {isAppt ? t.add.newAppt : t.add.newTask}
        </h3>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <input
        data-autofocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !isAppt) submit() }}
        placeholder={isAppt ? t.add.apptName : t.add.taskName}
        className="field h-12 px-3.5 text-sm"
      />

      {!isAppt && (
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t.add.note}
          className="field h-11 px-3.5 text-sm"
        />
      )}

      <button
        onClick={() => setIsAppt(p => !p)}
        className="flex items-center justify-between w-full px-3.5 py-3 rounded-[var(--r-md)] border text-sm transition-colors"
        style={{
          background: isAppt ? 'var(--gold-tint)' : 'var(--surface2)',
          borderColor: isAppt ? 'var(--gold)' : 'var(--border)',
        }}
      >
        <span style={{ color: 'var(--text)' }}>{t.add.scheduledAppt}</span>
        <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
          style={{ background: isAppt ? 'var(--gold)' : 'var(--border)', justifyContent: isAppt ? 'flex-end' : 'flex-start' }}>
          <div className="w-4 h-4 rounded-full bg-white" />
        </div>
      </button>

      {isAppt ? (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.add.apptTime}</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="field h-12 px-3.5 text-sm" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.add.remindBefore}</label>
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input
                type="number" min={0} max={999} value={reminderValue}
                onChange={e => setReminderValue(Math.max(0, Number(e.target.value)))}
                className="field h-12 px-3 text-sm text-center"
              />
              <select
                value={reminderUnit}
                onChange={e => setReminderUnit(e.target.value as 'min' | 'sat')}
                className="field field-select h-12 px-3 text-sm w-20"
              >
                <option value="min">{t.add.min}</option>
                <option value="sat">{t.add.hour}</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.add.priorityLabel}</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="field field-select h-11 px-2 text-sm">
              <option value="high">{t.priority.high}</option>
              <option value="medium">{t.priority.medium}</option>
              <option value="low">{t.priority.low}</option>
            </select>
          </div>
        </>
      )}

      <Button size="md" className="w-full" onClick={submit} loading={submitting} disabled={!name.trim()}>
        {isAppt ? t.add.addAppt : t.add.addTask}
      </Button>
    </Modal>
  )
}
