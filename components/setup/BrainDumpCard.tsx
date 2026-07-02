'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { Task, Appointment } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'
import { SectionHeader } from '@/components/setup/primitives'

async function fetchBrainDump(text: string): Promise<{ tasks: Task[]; appointments: Appointment[] }> {
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
    tasks: (tasks ?? []).map((t: Partial<Task>) => ({
      ...t,
      done: false,
      note: t.note ?? '',
      priority: t.priority ?? 'medium',
      type: t.type ?? 'light',
    })),
    appointments: (appointments ?? []).map((a: { name: string; time: string }) => ({
      name: a.name,
      time: a.time,
      reminder: DEFAULTS.reminderMinutes,
      done: false,
    })),
  }
}

// AI brain-dump: tekst → zadaci + termini. Drži sopstveno UI stanje; izvučene
// stavke prosleđuje roditelju (onExtracted). onLoadingChange čuva canSubmit guard.
export default function BrainDumpCard({
  onExtracted, onLoadingChange,
}: {
  onExtracted: (tasks: Task[], appointments: Appointment[]) => void
  onLoadingChange?: (loading: boolean) => void
}) {
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<number | null>(null)

  function setBusy(v: boolean) {
    setLoading(v)
    onLoadingChange?.(v)
  }

  async function handle() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { tasks: extracted, appointments: extractedAppts } = await fetchBrainDump(text)
      if (extracted.length === 0 && extractedAppts.length === 0) {
        setError('AI nije pronašao zadatke. Pokušaj opisati konkretnije, npr: "Moram da kupim mleko, nazovem Marka, završim izveštaj"')
        return
      }
      onExtracted(extracted, extractedAppts)
      setText('')
      setShow(false)
      setSuccess(extracted.length)
      setTimeout(() => setSuccess(null), 3000)
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
      {success !== null && (
        <div className="rounded-[var(--r-md)] px-4 py-2.5 text-sm" style={{ background: 'var(--ok-tint)', color: 'var(--ok)' }}>
          ✓ {success} {success === 1 ? 'zadatak dodat' : 'zadataka dodato'} u listu ispod
        </div>
      )}
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Napiši sve što ti je na umu — AI će izvući zadatke automatski.
      </p>
      {show ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Npr: Danas moram da završim prezentaciju za klijenta, zakažem zubarku, odgovorim na mejlove i kupim namirnice..."
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
              {loading ? 'Analiziram...' : '✨ Izvuci zadatke'}
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
