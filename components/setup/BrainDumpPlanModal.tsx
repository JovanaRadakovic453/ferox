'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { addDays, todayKey } from '@/lib/date'
import { formatDate } from '@/lib/utils'
import { AI } from '@/lib/config'
import { PRIORITY_LABELS } from '@/types/ferox'
import type { TaskType, Priority } from '@/types/ferox'

// Stavke koje AI predloži (već normalizovane u BrainDumpCard).
export type PlanTask = {
  name: string
  type: TaskType
  priority: Priority
  note: string
  dayOffset: number
  reason: string
}
export type PlanAppt = {
  name: string
  time: string
  dayOffset: number
}
export type BrainDumpPlan = { tasks: PlanTask[]; appointments: PlanAppt[] }

const HORIZON = AI.brainDumpHorizonDays

function dayLabel(offset: number): string {
  if (offset === 0) return 'Danas'
  if (offset === 1) return 'Sutra'
  return `Za ${offset} dana`
}

// Predlog nedeljnog plana: korisnik pregleda, po želji promeni prioritet/dan
// ili izbaci stavku, pa "Potvrdi plan". Ništa se ne čuva dok ne potvrdi.
export default function BrainDumpPlanModal({
  open, plan, onCancel, onConfirm, saving,
}: {
  open: boolean
  plan: BrainDumpPlan
  onCancel: () => void
  onConfirm: (tasks: PlanTask[], appts: PlanAppt[]) => void
  saving: boolean
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(plan.tasks)
  const [appts, setAppts] = useState<PlanAppt[]>(plan.appointments)

  const baseKey = todayKey()

  const offsets = [...new Set([...tasks.map(t => t.dayOffset), ...appts.map(a => a.dayOffset)])]
    .sort((a, b) => a - b)

  const updateTask = (idx: number, patch: Partial<PlanTask>) =>
    setTasks(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  const updateAppt = (idx: number, patch: Partial<PlanAppt>) =>
    setAppts(prev => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)))

  const total = tasks.length + appts.length

  const daySelect = (value: number, onChange: (v: number) => void) => (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="field field-select h-9 px-2 text-xs"
      aria-label="Dan"
    >
      {Array.from({ length: HORIZON }, (_, i) => (
        <option key={i} value={i}>{dayLabel(i)}</option>
      ))}
    </select>
  )

  return (
    <Modal open={open} onClose={onCancel} titleId="plan-modal-title">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 id="plan-modal-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
            Predlog plana
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {total} {total === 1 ? 'stavka' : 'stavki'} raspoređeno po danima — proveri i potvrdi
          </p>
        </div>
        <button onClick={onCancel} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex flex-col gap-5">
        {offsets.map(offset => {
          const dayTasks = tasks.map((t, i) => ({ t, i })).filter(x => x.t.dayOffset === offset)
          const dayAppts = appts.map((a, i) => ({ a, i })).filter(x => x.a.dayOffset === offset)
          if (dayTasks.length === 0 && dayAppts.length === 0) return null
          return (
            <div key={offset} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="section-label" style={{ color: 'var(--text)' }}>{dayLabel(offset)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(addDays(baseKey, offset))}</span>
              </div>

              {dayAppts.map(({ a, i }) => (
                <div key={`a-${i}`} className="rounded-[var(--r-md)] p-3 flex flex-col gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>🕐 {a.name} · {a.time}</span>
                    <button onClick={() => setAppts(prev => prev.filter((_, idx) => idx !== i))} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--danger)' }} aria-label="Izbaci">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {daySelect(a.dayOffset, v => updateAppt(i, { dayOffset: v }))}
                  </div>
                </div>
              ))}

              {dayTasks.map(({ t, i }) => (
                <div key={`t-${i}`} className="rounded-[var(--r-md)] p-3 flex flex-col gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.name}</span>
                    <button onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--danger)' }} aria-label="Izbaci">✕</button>
                  </div>
                  {t.reason && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>💡 {t.reason}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {daySelect(t.dayOffset, v => updateTask(i, { dayOffset: v }))}
                    <select value={t.priority} onChange={e => updateTask(i, { priority: e.target.value as Priority })} className="field field-select h-9 px-2 text-xs" aria-label="Prioritet">
                      {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {total === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
            Sve stavke su izbačene. Otkaži pa pokušaj ponovo.
          </p>
        )}
      </div>

      <div className="flex gap-2 shrink-0 pt-1">
        <Button size="md" className="flex-1" onClick={() => onConfirm(tasks, appts)} loading={saving} disabled={total === 0}>
          Potvrdi plan
        </Button>
        <Button size="md" variant="ghost" onClick={onCancel} disabled={saving}>Otkaži</Button>
      </div>
    </Modal>
  )
}
