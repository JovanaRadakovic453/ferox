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
  sleepInsight: string | null
}

const WEEKDAYS_SR = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']

// Tekstovi zavise od jezika, ali računica ne. Zato ih prosleđujemo споља;
// default je srpski → svi postojeći pozivi (i testovi) rade netaknuto.
export interface AggLabels {
  weekdays: string[] // dužine 7, Ned..Sub
  sleepInsight: (hi: number, lo: number) => string
}

const DEFAULT_LABELS: AggLabels = {
  weekdays: WEEKDAYS_SR,
  sleepInsight: (hi, lo) => `Kad spavaš 7h+, završiš ${hi}% naspram ${lo}% sa manje sna.`,
}

function rate(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function computeAggregates(days: DayAgg[], labels: AggLabels = DEFAULT_LABELS): Aggregates {
  const totalDone = days.reduce((s, d) => s + d.done, 0)
  const totalTasks = days.reduce((s, d) => s + d.total, 0)

  // By weekday
  const byWeekday: Bar[] = []
  for (let wd = 0; wd < 7; wd++) {
    const ds = days.filter(d => d.weekday === wd)
    if (ds.length) {
      byWeekday.push({
        label: labels.weekdays[wd],
        rate: rate(ds.reduce((s, d) => s + d.done, 0), ds.reduce((s, d) => s + d.total, 0)),
        n: ds.length,
      })
    }
  }

  // Sleep vs completion
  const lowSleep = days.filter(d => d.sleep_hours != null && d.sleep_hours < 7)
  const highSleep = days.filter(d => d.sleep_hours != null && d.sleep_hours >= 7)
  let sleepInsight: string | null = null
  if (lowSleep.length >= 2 && highSleep.length >= 2) {
    const lo = rate(lowSleep.reduce((s, d) => s + d.done, 0), lowSleep.reduce((s, d) => s + d.total, 0))
    const hi = rate(highSleep.reduce((s, d) => s + d.done, 0), highSleep.reduce((s, d) => s + d.total, 0))
    if (hi - lo >= 10) sleepInsight = labels.sleepInsight(hi, lo)
  }

  return {
    dayCount: days.length,
    overallCompletion: rate(totalDone, totalTasks),
    byWeekday,
    sleepInsight,
  }
}
