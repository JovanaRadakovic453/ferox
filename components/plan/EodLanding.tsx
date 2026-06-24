'use client'

import { useEffect, useState } from 'react'
import { tomorrowKey } from '@/lib/date'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'

// Čist "Dan završen" landing na početnoj (/). Renderuje se kad današnji entry
// ima finished_at. Sad uključuje i AI recap + kratku refleksiju.
export default function EodLanding({
  doneCount,
  total,
  transferredCount,
  tomorrowPlanned,
  dateKey,
  eodRecap = null,
  reflection: initialReflection = null,
  streak = 0,
}: {
  doneCount: number
  total: number
  transferredCount: number
  tomorrowPlanned: boolean
  dateKey: string
  eodRecap?: string | null
  reflection?: string | null
  streak?: number
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const [recap, setRecap] = useState<string | null>(eodRecap)
  const [reflection, setReflection] = useState(initialReflection ?? '')
  const [savedReflection, setSavedReflection] = useState(initialReflection ?? '')
  const [savingReflection, setSavingReflection] = useState(false)

  useEffect(() => {
    if (recap) return
    let cancelled = false
    fetch('/api/ai/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.recap) setRecap(d.recap) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [recap, dateKey])

  async function saveReflection() {
    if (reflection === savedReflection) return
    setSavingReflection(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('day_entries').update({ reflection }).eq('user_id', user.id).eq('date_key', dateKey)
        setSavedReflection(reflection)
      }
    } finally {
      setSavingReflection(false)
    }
  }

  return (
    <main className="flex flex-col gap-6 pb-2">
      <header className="pt-6 text-center flex flex-col items-center gap-3">
        <span className="text-5xl">🌙</span>
        <h1 className="display text-4xl" style={{ color: 'var(--gold)' }}>Dan završen</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Odmori se — sutra je novi dan.
        </p>
        {streak > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
            🔥 {streak} {streak === 1 ? 'dan' : 'dana'} zaredom
          </span>
        )}
      </header>

      {/* AI recap */}
      {recap && (
        <div className="card p-5">
          <p className="text-sm italic" style={{ color: 'var(--text)' }}>"{recap}"</p>
        </div>
      )}

      {/* Pregled učinka */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Završeno
            </p>
            <p className="display text-5xl leading-none mt-1" style={{ color: 'var(--text)' }}>
              {doneCount}
              <span className="text-2xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--gold)' }}>{pct}%</span>
        </div>
        <div className="rounded-full overflow-hidden h-2.5" style={{ background: 'var(--surface2)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {transferredCount > 0
            ? `📦 ${transferredCount} ${transferredCount === 1 ? 'zadatak prenet' : 'zadataka preneto'} za sutra`
            : '✨ Sve čisto za danas'}
        </p>
      </div>

      {/* Refleksija */}
      <div className="card p-5 flex flex-col gap-3">
        <p className="section-label">Kako je prošao dan?</p>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          onBlur={saveReflection}
          placeholder="Par reči za sebe (opciono)..."
          rows={2}
          className="field p-3 text-sm resize-none"
        />
        {reflection !== savedReflection && (
          <Button size="sm" variant="secondary" onClick={saveReflection} loading={savingReflection}>
            Sačuvaj belešku
          </Button>
        )}
      </div>

      {/* Akcije */}
      <div className="flex flex-col gap-3">
        {tomorrowPlanned ? (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
            🌙 Pogledaj plan za sutra
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/?sutra=1' }}>
            🌙 Planiraj sutra
          </Button>
        )}
        <Button size="md" variant="secondary" className="w-full" onClick={() => { window.location.href = '/plan?date=' + dateKey }}>
          Pogledaj današnji plan
        </Button>
      </div>

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>
    </main>
  )
}
