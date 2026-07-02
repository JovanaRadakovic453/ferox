'use client'

import { useEffect, useState } from 'react'
import LogoutButton from '@/components/LogoutButton'

export default function EodLanding({
  doneCount,
  total,
  transferredCount,
  dateKey,
  eodRecap = null,
  streak = 0,
}: {
  doneCount: number
  total: number
  transferredCount: number
  dateKey: string
  eodRecap?: string | null
  streak?: number
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const [recap, setRecap] = useState<string | null>(eodRecap)
  const [recapFailed, setRecapFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (recap) return
    let cancelled = false
    setRecapFailed(false)
    fetch('/api/ai/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        if (d?.recap) setRecap(d.recap)
        else setRecapFailed(true)
      })
      .catch(() => { if (!cancelled) setRecapFailed(true) })
    return () => { cancelled = true }
  }, [recap, dateKey, attempt])

  return (
    <main className="flex flex-col gap-6 lg:gap-7 pb-2 lg:max-w-2xl lg:mx-auto lg:w-full">
      <header className="pt-6 lg:pt-10 text-center flex flex-col items-center gap-3">
        <span className="text-5xl lg:text-6xl">🌙</span>
        <h1 className="display text-4xl lg:text-5xl" style={{ color: 'var(--gold)' }}>Dan završen</h1>
        <p className="text-sm lg:text-base" style={{ color: 'var(--text-muted)' }}>
          Odmori se — sutra je novi dan.
        </p>
        {streak > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
            🔥 {streak} {streak === 1 ? 'dan' : 'dana'} zaredom
          </span>
        )}
      </header>

      {recap && (
        <div className="card p-5 lg:p-7">
          <p className="text-sm lg:text-base italic leading-relaxed" style={{ color: 'var(--text)' }}>"{recap}"</p>
        </div>
      )}

      {!recap && recapFailed && (
        <div className="card p-5 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Rezime dana trenutno nije dostupan.
          </p>
          <button
            onClick={() => setAttempt(a => a + 1)}
            className="text-sm font-semibold shrink-0 transition-opacity hover:opacity-75"
            style={{ color: 'var(--gold)' }}
          >
            Pokušaj ponovo
          </button>
        </div>
      )}

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Završeno
            </p>
            <p className="display text-5xl lg:text-6xl leading-none mt-1" style={{ color: 'var(--text)' }}>
              {doneCount}
              <span className="text-2xl lg:text-3xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
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

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>
    </main>
  )
}
