import Button from '@/components/ui/Button'
import { EnergyMeter, ENERGY_OPTIONS } from '@/components/setup/primitives'

// Desktop rail: živi sažetak (energija / zadaci / san / kapacitet) + CTA.
export default function PreviewRail({
  isSutraMode, energy, taskCount, taskWord, apptCount, totalItems, totalWord, sleepHours, heavyCount, energyCapacity, overBy, canSubmit, loading, onSubmit,
}: {
  isSutraMode: boolean
  energy: number | null
  taskCount: number
  taskWord: string
  apptCount: number
  totalItems: number
  totalWord: string
  sleepHours: number
  heavyCount: number
  energyCapacity: number
  overBy: number
  canSubmit: boolean
  loading: boolean
  onSubmit: () => void
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 rail-sticky">
      <div className="card p-6 flex flex-col gap-5">
        <div>
          <p className="section-label mb-2">Pregled</p>
          <h2 className="title-serif text-2xl" style={{ color: 'var(--text)' }}>
            {isSutraMode ? 'Sutrašnji plan' : 'Današnji plan'}
          </h2>
        </div>

        {energy ? (
          <div className="flex items-center gap-3 rounded-[var(--r-md)] p-3.5" style={{ background: 'var(--surface2)' }}>
            <span className="text-2xl">{ENERGY_OPTIONS[energy - 1].emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Energija</p>
              <p className="text-sm font-semibold">{ENERGY_OPTIONS[energy - 1].label}</p>
            </div>
            <EnergyMeter strength={6 - energy} active={false} />
          </div>
        ) : (
          <div className="rounded-[var(--r-md)] p-3.5 text-sm text-center" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
            ⚡ Izaberi nivo energije
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--r-md)] p-3.5 text-center" style={{ background: 'var(--surface2)' }}>
            <p className="display text-3xl foil leading-none">{taskCount}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{taskWord}</p>
            {apptCount > 0 && (
              <p className="text-[0.65rem] mt-1 font-medium" style={{ color: 'var(--gold)' }}>
                +{apptCount} {apptCount === 1 ? 'termin' : 'termina'}
              </p>
            )}
          </div>
          <div className="rounded-[var(--r-md)] p-3.5 text-center" style={{ background: 'var(--surface2)' }}>
            <p className="display text-3xl leading-none" style={{ color: 'var(--text)' }}>{sleepHours > 0 ? `${sleepHours}h` : '—'}</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>sna</p>
          </div>
        </div>

        {energy && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Teški zadaci</span>
              <span className="tabular-nums">{heavyCount} / {energyCapacity === Infinity ? '∞' : energyCapacity}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${energyCapacity === Infinity ? 0 : Math.min(100, (heavyCount / Math.max(1, energyCapacity)) * 100)}%`, backgroundImage: overBy > 0 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))' }} />
            </div>
            {overBy > 0 && <p className="text-xs" style={{ color: '#c0392b' }}>{overBy} iznad realnog kapaciteta za danas</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={onSubmit}>
          {totalItems > 0 ? `Napravi plan · ${totalItems} ${totalWord} →` : 'Napravi moj plan →'}
        </Button>
        {!canSubmit && !loading && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {!energy ? '⚡ Izaberi nivo energije' : '📋 Dodaj bar jedan zadatak ili termin'}
          </p>
        )}
      </div>
    </aside>
  )
}
