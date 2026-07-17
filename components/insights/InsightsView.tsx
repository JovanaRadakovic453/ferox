'use client'

import type { Aggregates, Bar } from '@/lib/insights'
import type { ConsistencyCell } from '@/lib/consistency'
import ProgressRing from '@/components/ui/ProgressRing'
import ConsistencyHeatmap from '@/components/insights/ConsistencyHeatmap'
import { useT } from '@/components/i18n/I18nProvider'

function BarRow({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>{label}</span>
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

function StatTile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1.5">
      <span className="text-lg" aria-hidden>{icon}</span>
      <p className="display text-2xl lg:text-3xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

export default function InsightsView({
  agg, streak = 0, bestStreak = 0, totalDone = 0, consistencyWeeks = [],
}: {
  agg: Aggregates
  streak?: number
  bestStreak?: number
  totalDone?: number
  consistencyWeeks?: ConsistencyCell[][]
}) {
  const t = useT()
  return (
    <main className="flex flex-col gap-5 lg:gap-6 pb-2 stagger">
      <header className="pt-2" style={{ ['--i' as string]: 0 }}>
        <div className="hidden lg:block mb-2"><span className="section-label">{t.insights.patterns}</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">{t.insights.title}</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {t.insights.subtitle(agg.dayCount)}
        </p>
      </header>

      {/* Ključne brojke */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ ['--i' as string]: 1 }}>
        <StatTile icon="🔥" value={String(streak)} label={streak === 1 ? t.insights.streakDay : t.insights.streakDays} />
        <StatTile icon="🏆" value={String(bestStreak)} label={t.insights.bestStreak} />
        <StatTile icon="✅" value={String(totalDone)} label={t.insights.tasksDone} />
        <StatTile icon="📅" value={String(agg.dayCount)} label={t.insights.daysTracked} />
      </div>

      {/* Kalendar doslednosti (heatmap) */}
      {consistencyWeeks.length > 0 && (
        <div style={{ ['--i' as string]: 2 }}>
          <ConsistencyHeatmap weeks={consistencyWeeks} />
        </div>
      )}

      {/* Ukupna realizacija — brojčanik */}
      <div className="card p-6 lg:p-7 flex items-center gap-6 lg:gap-8" style={{ ['--i' as string]: 3 }}>
        <ProgressRing pct={agg.overallCompletion} size={132} sublabel={t.common.completed} />
        <div className="min-w-0">
          <p className="section-label mb-2">{t.insights.overallTitle}</p>
          <p className="text-sm lg:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t.insights.overallDone}{' '}
            <span className="font-semibold" style={{ color: 'var(--gold)' }}>{agg.overallCompletion}%</span>.
            {agg.overallCompletion >= 70 ? t.insights.goodRhythm : t.insights.slowRhythm}
          </p>
        </div>
      </div>

      {agg.sleepInsight && (
        <div className="card p-5 lg:p-6" style={{ ['--i' as string]: 4 }}>
          <p className="section-label mb-2">{t.insights.sleepTitle}</p>
          <p className="text-sm lg:text-base" style={{ color: 'var(--text)' }}>😴 {agg.sleepInsight}</p>
        </div>
      )}

      {/* Grafici */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 items-start" style={{ ['--i' as string]: 5 }}>
        <ChartCard title={t.insights.weekdayChart} bars={agg.byWeekday} />
      </div>
    </main>
  )
}
