'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { PlanTask, PlanAppt, BrainDumpPlan } from '@/components/setup/BrainDumpPlanModal'
import { SectionHeader } from '@/components/setup/primitives'

type ApiTask = { name: string; type?: PlanTask['type']; priority?: PlanTask['priority']; note?: string; dayOffset?: number; reason?: string }
type ApiAppt = { name: string; time: string; dayOffset?: number }

async function fetchBrainDump(text: string): Promise<BrainDumpPlan> {
  const res = await fetch('/api/ai/brain-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? body.error ?? `Greška ${res.status}`)
  }
  const { tasks, appointments } = await res.json()
  return {
    tasks: (tasks ?? []).map((t: ApiTask): PlanTask => ({
      name: t.name,
      note: t.note ?? '',
      priority: t.priority ?? 'medium',
      type: t.type ?? 'light',
      dayOffset: t.dayOffset ?? 0,
      reason: t.reason ?? '',
    })),
    appointments: (appointments ?? []).map((a: ApiAppt): PlanAppt => ({
      name: a.name,
      time: a.time,
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
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setBusy(v: boolean) {
    setLoading(v)
    onLoadingChange?.(v)
  }

  async function handle() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const plan = await fetchBrainDump(text)
      if (plan.tasks.length === 0 && plan.appointments.length === 0) {
        setError('AI nije pronašao zadatke. Pokušaj opisati konkretnije, npr: "Moram da kupim mleko, nazovem Marka, završim izveštaj"')
        return
      }
      onPlan(plan)
      setText('')
      setShow(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška')
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
        icon="✨"
        title="Brain dump"
        trailing={
          <span className="text-[0.65rem] font-bold tracking-wide px-2.5 py-1 rounded-full" style={{ background: 'var(--gold)', color: '#fff', boxShadow: 'var(--sh-gold)' }}>
            AI
          </span>
        }
      />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Napiši sve što ti je na umu — za danas ili narednih dana. AI će izvući zadatke i rasporediti ih po danima, a ti potvrdiš.
      </p>
      {show ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Npr: Spremiti ispit do petka, poslati izveštaj šefu, zakazati zubara, kupiti namirnice danas, pozvati baku, isplanirati putovanje za vikend..."
            rows={4}
            autoFocus
            className="field p-3.5 text-sm resize-none"
          />
          {error && (
            <p className="text-xs px-1" style={{ color: 'var(--danger)' }}>Greška: {error}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handle} loading={loading}
              disabled={!text.trim()} className="flex-1">
              {loading ? 'Pravim plan...' : '✨ Napravi plan'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShow(false); setText(''); setError(null) }}>
              Otkaži
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShow(true)}
          className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed text-sm w-full transition-colors"
          style={{ borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))', color: 'var(--gold)' }}>
          <span>✨</span> Piši slobodno, AI izvlači zadatke
        </button>
      )}
    </section>
  )
}
