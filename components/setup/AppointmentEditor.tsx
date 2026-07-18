'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Appointment } from '@/types/ferox'
import { SectionHeader, CountChip, EMPTY_APPT, EMPTY_APPT_REMINDER } from '@/components/setup/primitives'
import { useT } from '@/components/i18n/I18nProvider'

export default function AppointmentEditor({
  appointments, onAdd, onRemove,
}: {
  appointments: Appointment[]
  onAdd: (a: { name: string; time: string; reminder: number }) => void
  onRemove: (index: number) => void
}) {
  const t = useT()
  const [form, setForm] = useState({ ...EMPTY_APPT })
  const [reminderInput, setReminderInput] = useState(EMPTY_APPT_REMINDER)
  const [showForm, setShowForm] = useState(false)

  function add() {
    if (!form.name.trim()) return
    const reminderMinutes = reminderInput.unit === 'sat'
      ? (reminderInput.value || 0) * 60
      : (reminderInput.value || 0)
    onAdd({ name: form.name, time: form.time, reminder: reminderMinutes })
    setForm({ ...EMPTY_APPT })
    setReminderInput(EMPTY_APPT_REMINDER)
    setShowForm(false)
  }

  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader icon="🗓️" title={t.setup.apptsTitle} trailing={<CountChip n={appointments.length} />} />

      {appointments.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {appointments.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
              <span className="text-sm font-semibold shrink-0 tabular-nums" style={{ color: 'var(--gold)' }}>
                {a.end_time ? `${a.time} – ${a.end_time}` : a.time}
              </span>
              <p className="text-sm flex-1 truncate">{a.name}</p>
              <button onClick={() => onRemove(i)}
                className="text-xs opacity-50 hover:opacity-100 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <Input id="appt-name" placeholder={t.setup.apptNamePh} value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input id="appt-time" label={t.setup.time} type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{t.setup.remindBefore}</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={reminderInput.value}
                  onChange={e => setReminderInput(r => ({ ...r, value: Math.max(0, Number(e.target.value)) }))}
                  className="field h-11 px-2 text-sm text-center flex-1 min-w-0 w-0"
                />
                <select
                  value={reminderInput.unit}
                  onChange={e => setReminderInput(r => ({ ...r, unit: e.target.value as 'min' | 'sat' }))}
                  className="field field-select h-11 px-2 text-sm shrink-0"
                  style={{ width: '5rem' }}
                >
                  <option value="min">{t.setup.unitMin}</option>
                  <option value="sat">{t.setup.unitHour}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={!form.name.trim()} className="flex-1">{t.setup.addTaskBtn}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY_APPT }); setReminderInput(EMPTY_APPT_REMINDER) }}>{t.common.cancel}</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed border-[var(--border)] text-sm w-full text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
          <span className="text-lg">+</span> {t.setup.addAppt}
        </button>
      )}
    </section>
  )
}
