import { DEFAULTS } from '@/lib/config'

// Pure, testable aggregation over recent days.

export interface DayAgg {
  date_key: string
  sleep_hours: number | null
  done: number
  total: number
  weekday: number // 0=Sun..6=Sat
}

export interface Bar { label: string; rate: number; n: number }

export interface Aggregates {
  dayCount: number
  overallCompletion: number
  byWeekday: Bar[]
  byZone: Bar[]
  sleepInsight: string | null
}

const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']

function rate(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function computeAggregates(
  days: DayAgg[],
  zoneStats: { label: string; done: number; total: number }[],
): Aggregates {
  const totalDone = days.reduce((s, d) => s + d.done, 0)
  const totalTasks = days.reduce((s, d) => s + d.total, 0)

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

  // By zone / oblast (label već sadrži ikonu+ime, top N po realizaciji)
  const byZone: Bar[] = zoneStats
    .filter(z => z.total > 0)
    .map(z => ({ label: z.label, rate: rate(z.done, z.total), n: z.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, DEFAULTS.insightsTopZones)

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
    byWeekday,
    byZone,
    sleepInsight,
  }
}
