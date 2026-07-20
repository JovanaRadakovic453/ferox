'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { PlanTask, PlanAppt, BrainDumpPlan } from '@/components/setup/BrainDumpPlanModal'
import { SectionHeader } from '@/components/setup/primitives'
import { useSpeechToText } from '@/lib/useSpeechToText'
import { useT, useLocale } from '@/components/i18n/I18nProvider'
import type { Dict } from '@/lib/i18n/dict'

type ApiTask = { name: string; type?: PlanTask['type']; priority?: PlanTask['priority']; note?: string; dayOffset?: number; deadlineDayOffset?: number | null; reason?: string }
type ApiAppt = { name: string; time: string; endTime?: string | null; dayOffset?: number }

async function fetchBrainDump(text: string, t: Dict): Promise<BrainDumpPlan> {
  const res = await fetch('/api/ai/brain-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? body.error ?? t.brain.httpError(res.status))
  }
  const { tasks, appointments } = await res.json()
  return {
    tasks: (tasks ?? []).map((t: ApiTask): PlanTask => ({
      name: t.name,
      note: t.note ?? '',
      priority: t.priority ?? 'medium',
      type: t.type ?? 'light',
      dayOffset: t.dayOffset ?? 0,
      deadlineDayOffset: t.deadlineDayOffset ?? null,
      reason: t.reason ?? '',
    })),
    appointments: (appointments ?? []).map((a: ApiAppt): PlanAppt => ({
      name: a.name,
      time: a.time,
      endTime: a.endTime ?? null,
      dayOffset: a.dayOffset ?? 0,
    })),
  }
}

// AI brain-dump: tekst → predlog nedeljnog plana. Drži sopstveno UI stanje;
// predlog prosleđuje roditelju (onPlan) koji otvara ekran za potvrdu.
// onLoadingChange čuva canSubmit guard.
export default function BrainDumpCard({
  onPlan, onLoadingChange,
}: {
  onPlan: (plan: BrainDumpPlan) => void
  onLoadingChange?: (loading: boolean) => void
}) {
  const t = useT()
  const locale = useLocale()
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Govor → tekst na jeziku korisnika. Izgovoreno se dopisuje u polje.
  const { supported: micSupported, listening, start: startMic, stop: stopMic } = useSpeechToText({
    lang: locale === 'en' ? 'en-US' : 'sr-RS',
    onResult: chunk => setText(prev => (prev ? prev.trim() + ' ' : '') + chunk),
    onError: code => setError(
      code === 'not-allowed' || code === 'service-not-allowed'
        ? t.brain.micDenied
        : t.brain.voiceFailed
    ),
  })

  function beginVoice() {
    setError(null)
    setShow(true)
    startMic()
  }

  function setBusy(v: boolean) {
    setLoading(v)
    onLoadingChange?.(v)
  }

  async function handle() {
    if (listening) stopMic()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const plan = await fetchBrainDump(text, t)
      if (plan.tasks.length === 0 && plan.appointments.length === 0) {
        setError(t.brain.noTasks)
        return
      }
      onPlan(plan)
      setText('')
      setShow(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.brain.unknownError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="card p-7 flex flex-col gap-6"
      style={{ backgroundImage: 'linear-gradient(180deg, var(--gold-tint), transparent 55%)' }}
    >
      <SectionHeader
        icon="sparkle"
        title={t.brain.title}
        trailing={
          /* Obeležje, ne dugme — zato tanak okvir umesto punog zlatnog kruga sa
             sjajem, koji je vukao pažnju jače nego sam sadržaj kartice. */
          <span
            className="text-[0.65rem] font-semibold tracking-[0.1em] px-2 py-0.5 rounded-[7px]"
            style={{ color: 'var(--gold)', border: '1px solid var(--gold)' }}
          >
            AI
          </span>
        }
      />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t.brain.intro}
      </p>
      {show ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t.brain.textPh}
            rows={4}
            autoFocus
            className="field p-3.5 text-sm resize-none"
          />
          {micSupported && (
            <button
              onClick={() => (listening ? stopMic() : beginVoice())}
              className="flex items-center justify-center gap-2 h-10 rounded-[var(--r-sm)] text-sm font-medium transition-colors"
              style={
                listening
                  ? { background: 'var(--danger-tint)', color: 'var(--danger)', border: '1px solid var(--danger)' }
                  : { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }
              }
            >
              {listening
                ? <><span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} /> {t.brain.listening}</>
                : <>{t.brain.sayAloud}</>}
            </button>
          )}
          {error && (
            <p className="text-xs px-1" style={{ color: 'var(--danger)' }}>{t.brain.errorPrefix}{error}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handle} loading={loading}
              disabled={!text.trim()} className="flex-1">
              {loading ? t.brain.makingPlan : t.brain.makePlan}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { if (listening) stopMic(); setShow(false); setText(''); setError(null) }}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <button onClick={() => setShow(true)}
            className="flex items-center gap-2 p-4 rounded-[var(--r-sm)] border-[1.5px] border-dashed text-sm w-full transition-colors"
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))', color: 'var(--gold)' }}>
            {t.brain.writeFreely}
          </button>
          {micSupported && (
            <button onClick={beginVoice}
              className="flex items-center gap-2 p-4 rounded-[var(--r-sm)] border-[1.5px] border-dashed text-sm w-full transition-colors"
              style={{ borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))', color: 'var(--gold)' }}>
              {t.brain.sayAloudLong}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
