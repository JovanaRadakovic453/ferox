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
// Rezultat čuvanja: koliko je ušlo u današnji plan i koliko u kalendar (naredni dani).
export type ConfirmResult = { ok: boolean; todayCount: number; futureCount: number; error?: string }

const HORIZON = AI.brainDumpHorizonDays

function dayLabel(offset: number): string {
  if (offset === 0) return 'Danas'
  if (offset === 1) return 'Sutra'
  return `Za ${offset} dana`
}

// Predlog nedeljnog plana: korisnik pregleda, po želji promeni prioritet/dan
// ili izbaci stavku, pa "Potvrdi plan". Ništa se ne čuva dok ne potvrdi.
// Poruke (uspeh/greška) prikazuju se UNUTAR modala — na grešku se ništa ne gubi.
export default function BrainDumpPlanModal({
  open, plan, onClose, onConfirm,
}: {
  open: boolean
  plan: BrainDumpPlan
  onClose: () => void
  onConfirm: (tasks: PlanTask[], appts: PlanAppt[]) => Promise<ConfirmResult>
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(plan.tasks)
  const [appts, setAppts] = useState<PlanAppt[]>(plan.appointments)
  const [phase, setPhase] = useState<'review' | 'saving' | 'done'>('review')
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ today: number; future: number }>({ today: 0, future: 0 })

  const baseKey = todayKey()

  async function handleConfirm() {
    setError(null)
    setPhase('saving')
    const r = await onConfirm(tasks, appts)
    if (r.ok) {
      setSummary({ today: r.todayCount, future: r.futureCount })
      setPhase('done')
    } else {
      setError(r.error ?? 'Nešto nije sačuvano — pokušaj ponovo')
      setPhase('review')
    }
  }

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

  // Ekran posle uspešnog čuvanja — jasno piše gde je šta otišlo (da ništa ne "nestane").
  if (phase === 'done') {
    return (
      <Modal open={open} onClose={onClose} titleId="plan-modal-title">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <span className="text-4xl">✅</span>
          <h3 id="plan-modal-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>Plan je sačuvan</h3>
          <div className="flex flex-col gap-2 w-full">
            {summary.today > 0 && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm text-left" style={{ background: 'var(--surface2)' }}>
                <b>{summary.today}</b> {summary.today === 1 ? 'stavka je' : 'stavki je'} u <b>današnjem planu</b> — vidiš ih u listi ispod. Ne zaboravi da klikneš <b>„Napravi plan“</b> da završiš dan.
              </div>
            )}
            {summary.future > 0 && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm text-left" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
                <b>{summary.future}</b> {summary.future === 1 ? 'zadatak je zakazan' : 'zadataka je zakazano'} za <b>naredne dane</b> — čekaju te u <b>Kalendaru</b> i sami se ponude tog jutra.
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full pt-1">
            {summary.future > 0 && (
              <Button size="md" variant="secondary" className="flex-1" onClick={() => { window.location.href = '/calendar' }}>
                Otvori Kalendar
              </Button>
            )}
            <Button size="md" className="flex-1" onClick={onClose}>U redu</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={phase === 'saving' ? () => {} : onClose} titleId="plan-modal-title">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 id="plan-modal-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
            Predlog plana
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {total} {total === 1 ? 'stavka' : 'stavki'} raspoređeno po danima — proveri i potvrdi
          </p>
        </div>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
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

      {error && (
        <div className="rounded-[var(--r-md)] px-4 py-2.5 text-sm shrink-0" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 shrink-0 pt-1">
        <Button size="md" className="flex-1" onClick={handleConfirm} loading={phase === 'saving'} disabled={total === 0 || phase === 'saving'}>
          Potvrdi plan
        </Button>
        <Button size="md" variant="ghost" onClick={onClose} disabled={phase === 'saving'}>Otkaži</Button>
      </div>
    </Modal>
  )
}
