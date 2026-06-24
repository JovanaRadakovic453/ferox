'use client'

import { tomorrowKey } from '@/lib/date'
import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'

// Čist "Dan završen" landing na početnoj (/). Renderuje se kad današnji entry
// ima finished_at — tako se korisnik posle završetka dana vrati na početnu,
// umesto da ostane zaglavljen na /plan ekranu.
export default function EodLanding({
  doneCount,
  total,
  transferredCount,
  tomorrowPlanned,
  dateKey,
}: {
  doneCount: number
  total: number
  transferredCount: number
  tomorrowPlanned: boolean
  dateKey: string
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <main className="flex flex-col gap-6 pb-2">
      <header className="pt-6 text-center flex flex-col items-center gap-3">
        <span className="text-5xl">🌙</span>
        <h1 className="display text-4xl" style={{ color: 'var(--gold)' }}>Dan završen</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Odmori se — sutra je novi dan.
        </p>
      </header>

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
