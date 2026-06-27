'use client'

import type { Aggregates, Forecast, Bar } from '@/lib/insights'
import { ENERGY_LABELS, TASK_TYPE_LABELS } from '@/types/ferox'
import type { TaskType, EnergyLevel } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'

function BarRow({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }} />
      </div>
      <span className="text-xs tabular-nums w-9 text-right" style={{ color: 'var(--text-muted)' }}>{rate}%</span>
    </div>
  )
}

function ChartCard({ title, bars }: { title: string; bars: Bar[] }) {
  if (bars.length === 0) return null
  return (
    <div className="card p-5 lg:p-6 flex flex-col gap-3">
      <p className="section-label">{title}</p>
      <div className="flex flex-col gap-2.5">
        {bars.map((b, i) => <BarRow key={i} label={b.label} rate={b.rate} />)}
      </div>
    </div>
  )
}

export default function InsightsView({ agg, forecast }: { agg: Aggregates; forecast: Forecast | null }) {

  const typeBars = agg.byType.slice(0, DEFAULTS.insightsTopTaskTypes).map(b => ({
    ...b,
    label: TASK_TYPE_LABELS[b.label as TaskType] ?? b.label,
  }))

  return (
    <main className="flex flex-col gap-5 lg:gap-6 pb-2">
      <header className="pt-2">
        <div className="hidden lg:block mb-2"><span className="section-label">Tvoji obrasci</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">Uvidi</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Na osnovu {agg.dayCount} {agg.dayCount === 1 ? 'dana' : 'dana'}.
        </p>
      </header>

      {/* Prognoza + ukupna realizacija */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        {forecast && (
          <div className="card p-5 lg:p-7 flex flex-col justify-center" style={{ backgroundImage: 'linear-gradient(180deg, var(--gold-tint), transparent 60%)' }}>
            <p className="section-label mb-2">Prognoza za sutra</p>
            <p className="text-lg lg:text-2xl leading-snug" style={{ color: 'var(--text)' }}>
              Verovatno ćeš biti <span className="font-semibold" style={{ color: 'var(--gold)' }}>{ENERGY_LABELS[forecast.level as EnergyLevel]}</span>
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {forecast.note} Pouzdanost: {forecast.confidence}.
            </p>
          </div>
        )}
        <div className={`card p-5 lg:p-7 flex items-center justify-between ${forecast ? '' : 'lg:col-span-2'}`}>
          <p className="section-label">Ukupna realizacija</p>
          <p className="display text-3xl lg:text-5xl" style={{ color: 'var(--gold)' }}>{agg.overallCompletion}%</p>
        </div>
      </div>

      {agg.sleepInsight && (
        <div className="card p-5 lg:p-6">
          <p className="section-label mb-2">San i učinak</p>
          <p className="text-sm lg:text-base" style={{ color: 'var(--text)' }}>😴 {agg.sleepInsight}</p>
        </div>
      )}

      {/* Grafici */}
      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <ChartCard title="Realizacija po energiji" bars={agg.byEnergy} />
        <ChartCard title="Realizacija po danu u nedelji" bars={agg.byWeekday} />
        <ChartCard title="Realizacija po tipu zadatka" bars={typeBars} />
      </div>
    </main>
  )
}
