import type { TaskType } from '@/types/ferox'

// Pure, testable aggregation over recent days. energy_level canonical 1=best.

export interface DayAgg {
  date_key: string
  energy_level: number | null
  sleep_hours: number | null
  done: number
  total: number
  weekday: number // 0=Sun..6=Sat
}

export interface Bar { label: string; rate: number; n: number }

export interface Aggregates {
  dayCount: number
  overallCompletion: number
  byEnergy: Bar[]
  byWeekday: Bar[]
  byType: Bar[]
  sleepInsight: string | null
}

export interface Forecast {
  level: number
  confidence: 'niska' | 'srednja' | 'visoka'
  note: string
}

const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
const ENERGY_SHORT: Record<number, string> = { 1: '🔥', 2: '😊', 3: '😐', 4: '🥱', 5: '🪫' }

function rate(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function computeAggregates(
  days: DayAgg[],
  typeStats: { type: TaskType; done: number; total: number }[],
): Aggregates {
  const totalDone = days.reduce((s, d) => s + d.done, 0)
  const totalTasks = days.reduce((s, d) => s + d.total, 0)

  // By energy level
  const byEnergy: Bar[] = []
  for (let lvl = 1; lvl <= 5; lvl++) {
    const ds = days.filter(d => d.energy_level === lvl)
    if (ds.length) {
      byEnergy.push({
        label: ENERGY_SHORT[lvl],
        rate: rate(ds.reduce((s, d) => s + d.done, 0), ds.reduce((s, d) => s + d.total, 0)),
        n: ds.length,
      })
    }
  }

  // By weekday
  const byWeekday: Bar[] = []
  for (let wd = 0; wd < 7; wd++) {
    const ds = days.filter(d => d.weekday === wd)
    if (ds.length) {
      byWeekday.push({
        label: WEEKDAYS[wd],
        rate: rate(ds.reduce((s, d) => s + d.done, 0), ds.reduce((s, d) => s + d.total, 0)),
        n: ds.length,
      })
    }
  }

  // By task type
  const byType: Bar[] = typeStats
    .filter(t => t.total > 0)
    .map(t => ({ label: t.type, rate: rate(t.done, t.total), n: t.total }))
    .sort((a, b) => b.rate - a.rate)

  // Sleep vs completion
  const lowSleep = days.filter(d => d.sleep_hours != null && d.sleep_hours < 7)
  const highSleep = days.filter(d => d.sleep_hours != null && d.sleep_hours >= 7)
  let sleepInsight: string | null = null
  if (lowSleep.length >= 2 && highSleep.length >= 2) {
    const lo = rate(lowSleep.reduce((s, d) => s + d.done, 0), lowSleep.reduce((s, d) => s + d.total, 0))
    const hi = rate(highSleep.reduce((s, d) => s + d.done, 0), highSleep.reduce((s, d) => s + d.total, 0))
    if (hi - lo >= 10) sleepInsight = `Kad spavaš 7h+, završiš ${hi}% naspram ${lo}% sa manje sna.`
  }

  return {
    dayCount: days.length,
    overallCompletion: rate(totalDone, totalTasks),
    byEnergy,
    byWeekday,
    byType,
    sleepInsight,
  }
}

/** Predict tomorrow's energy from same-weekday history blended with recent trend. */
export function forecastTomorrow(days: DayAgg[], tomorrowWeekday: number): Forecast | null {
  const withLevel = days.filter(d => d.energy_level != null) as (DayAgg & { energy_level: number })[]
  if (withLevel.length < 3) return null

  const sameDow = withLevel.filter(d => d.weekday === tomorrowWeekday)
  const recent = withLevel.slice(0, 3)
  const avg = (arr: { energy_level: number }[]) => arr.reduce((s, d) => s + d.energy_level, 0) / arr.length

  const recentAvg = avg(recent)
  const dowAvg = sameDow.length ? avg(sameDow) : recentAvg
  const blended = sameDow.length ? dowAvg * 0.6 + recentAvg * 0.4 : recentAvg
  const level = Math.min(5, Math.max(1, Math.round(blended)))

  const confidence: Forecast['confidence'] =
    withLevel.length >= 10 && sameDow.length >= 2 ? 'visoka'
    : withLevel.length >= 6 ? 'srednja'
    : 'niska'

  const note = sameDow.length >= 2
    ? `Na osnovu prethodnih sličnih dana.`
    : `Na osnovu poslednjih nekoliko dana.`

  return { level, confidence, note }
}
