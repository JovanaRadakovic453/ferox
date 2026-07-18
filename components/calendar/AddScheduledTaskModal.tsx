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
}

type RepeatChoice = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'

export default function AddScheduledTaskModal({
  open,
  onClose,
  onAdd,
  onRepeated,
  date,
}: {
  open: boolean
  onClose: () => void
  onAdd: (task: ScheduledTask) => void
  /** Serija pravi zadatke na više dana — ekran mora da se osveži, ne samo dopuni. */
  onRepeated?: () => void
  date: string
}) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [repeat, setRepeat] = useState<RepeatChoice>('none')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [reminderValue, setReminderValue] = useState(1)
  const [reminderUnit, setReminderUnit] = useState<'dana' | 'sati' | 'minuta'>('dana')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState(date)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  useEffect(() => {
    if (open) {
      setName('')
      setPriority('medium')
      setRepeat('none')
      setRepeatUntil('')
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
          // Rok se namerno ne šalje uz ponavljanje — jedan fiksan rok bi značio da
          // su sva buduća pojavljivanja odmah probijena.
          deadline_date: repeat === 'none' && deadlineEnabled ? deadlineDate : null,
          note: '',
          repeat: repeat === 'none' ? null : { freq: repeat, until: repeatUntil || null },
        }),
      })
      if (!res.ok) {
        setError(t.sched.saveFailed)
        return
      }
      const data = await res.json()
      if (repeat !== 'none') onRepeated?.()
      else onAdd(data)
      onClose()
    } catch {
      setError(t.sched.saveError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} titleId="add-sched-title">
      <div className="flex items-center justify-between">
        <h3 id="add-sched-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          {t.sched.newTask}
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
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
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

      {/* Ponavljanje — dan u nedelji i datum u mesecu se izvode iz izabranog dana */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.sched.repeatLabel}</label>
        <select
          value={repeat}
          onChange={e => setRepeat(e.target.value as RepeatChoice)}
          className="field field-select h-11 px-2 text-sm"
        >
          <option value="none">{t.sched.repeatNone}</option>
          <option value="daily">{t.sched.repeatDaily}</option>
          <option value="weekdays">{t.sched.repeatWeekdays}</option>
          <option value="weekly">{t.sched.repeatWeekly}</option>
          <option value="monthly">{t.sched.repeatMonthly}</option>
        </select>
        {repeat !== 'none' && (
          <>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{t.sched.repeatHint}</p>
            <div className="mt-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{t.sched.repeatUntil}</label>
              <input
                type="date"
                value={repeatUntil}
                min={date}
                onChange={e => setRepeatUntil(e.target.value)}
                className="field h-11 px-3 text-sm w-full"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.sched.repeatUntilHint}</p>
            </div>
          </>
        )}
      </div>

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

      {repeat === 'none' && (
        <WhenFields
          startDate={date}
          deadlineEnabled={deadlineEnabled}
          onToggleDeadline={() => setDeadlineEnabled(p => !p)}
          deadlineDate={deadlineDate}
          onDeadlineChange={setDeadlineDate}
        />
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <Button size="md" className="w-full" onClick={submit} loading={submitting} disabled={!name.trim()}>
        {t.sched.addTask}
      </Button>
    </Modal>
  )
}
