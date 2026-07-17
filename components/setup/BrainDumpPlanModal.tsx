'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { addDays, todayKey } from '@/lib/date'
import { getDeadlineBadge } from '@/lib/deadline'
import { formatDate } from '@/lib/utils'
import { AI } from '@/lib/config'
import type { TaskType, Priority } from '@/types/ferox'
import { useT, useLocale, useTimezone } from '@/components/i18n/I18nProvider'
import type { Dict } from '@/lib/i18n/dict'

// Stavke koje AI predloži (već normalizovane u BrainDumpCard).
export type PlanTask = {
  name: string
  type: TaskType
  priority: Priority
  note: string
  /** Dan rada — kad se zadatak pojavi u planu. */
  dayOffset: number
  /** Rok — do kada mora biti gotovo (broj dana od danas). null = nema roka. */
  deadlineDayOffset: number | null
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

function dayLabel(offset: number, t: Dict): string {
  if (offset === 0) return t.brain.today
  if (offset === 1) return t.brain.tomorrow
  return t.brain.inDays(offset)
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
  const t = useT()
  const locale = useLocale()
  const tz = useTimezone()

  const baseKey = todayKey(tz)

  async function handleConfirm() {
    setError(null)
    setPhase('saving')
    const r = await onConfirm(tasks, appts)
    if (r.ok) {
      setSummary({ today: r.todayCount, future: r.futureCount })
      setPhase('done')
    } else {
      setError(r.error ?? t.sched.notSaved)
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
      aria-label={t.brain.dayLabel}
    >
      {Array.from({ length: HORIZON }, (_, i) => (
        <option key={i} value={i}>{dayLabel(i, t)}</option>
      ))}
    </select>
  )

  // Ekran posle uspešnog čuvanja — jasno piše gde je šta otišlo (da ništa ne "nestane").
  if (phase === 'done') {
    return (
      <Modal open={open} onClose={onClose} titleId="plan-modal-title">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <span className="text-4xl">✅</span>
          <h3 id="plan-modal-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>{t.brain.saved}</h3>
          <div className="flex flex-col gap-2 w-full">
            {summary.today > 0 && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm text-left" style={{ background: 'var(--surface2)' }}>
                <b>{t.brain.savedTodayN(summary.today)}</b> {t.brain.savedTodayRest}
              </div>
            )}
            {summary.future > 0 && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm text-left" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
                <b>{t.brain.savedFutureN(summary.future)}</b> {t.brain.savedFutureRest}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full pt-1">
            {summary.future > 0 && (
              <Button size="md" variant="secondary" className="flex-1" onClick={() => { window.location.href = '/calendar' }}>
                {t.brain.openCalendar}
              </Button>
            )}
            <Button size="md" className="flex-1" onClick={onClose}>{t.common.ok}</Button>
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
            {t.brain.proposalTitle}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t.brain.proposalSub(total)}
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
                <span className="section-label" style={{ color: 'var(--text)' }}>{dayLabel(offset, t)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(addDays(baseKey, offset), locale)}</span>
              </div>

              {dayAppts.map(({ a, i }) => (
                <div key={`a-${i}`} className="rounded-[var(--r-md)] p-3 flex flex-col gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>🕐 {a.name} · {a.time}</span>
                    <button onClick={() => setAppts(prev => prev.filter((_, idx) => idx !== i))} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--danger)' }} aria-label={t.brain.remove}>✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {daySelect(a.dayOffset, v => updateAppt(i, { dayOffset: v }))}
                  </div>
                </div>
              ))}

              {dayTasks.map(({ t: pt, i }) => (
                <div key={`t-${i}`} className="rounded-[var(--r-md)] p-3 flex flex-col gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{pt.name}</span>
                    <button onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--danger)' }} aria-label={t.brain.remove}>✕</button>
                  </div>
                  {pt.deadlineDayOffset != null && (
                    <span
                      className="self-start inline-flex items-center gap-1 text-[0.62rem] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: getDeadlineBadge(addDays(baseKey, pt.deadlineDayOffset), baseKey, locale).color, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
                    >
                      <span aria-hidden>▲</span> {getDeadlineBadge(addDays(baseKey, pt.deadlineDayOffset), baseKey, locale).text}
                    </span>
                  )}
                  {pt.reason && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>💡 {pt.reason}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {daySelect(pt.dayOffset, v => updateTask(i, { dayOffset: v }))}
                    <select value={pt.priority} onChange={e => updateTask(i, { priority: e.target.value as Priority })} className="field field-select h-9 px-2 text-xs" aria-label={t.brain.priorityAria}>
                      {(['high', 'medium', 'low'] as Priority[]).map(v => (
                        <option key={v} value={v}>{t.priority[v]}</option>
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
            {t.brain.allRemoved}
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
          {t.brain.confirmPlan}
        </Button>
        <Button size="md" variant="ghost" onClick={onClose} disabled={phase === 'saving'}>{t.common.cancel}</Button>
      </div>
    </Modal>
  )
}
