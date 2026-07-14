import { describe, it, expect } from 'vitest'
import { computeAggregates, type DayAgg } from '@/lib/insights'

function day(p: Partial<DayAgg> = {}): DayAgg {
  return {
    date_key: '2024-06-10',
    sleep_hours: 8,
    done: 3,
    total: 4,
    weekday: 1,
    ...p,
  }
}

describe('computeAggregates', () => {
  it('is safe on empty input (no div-by-zero)', () => {
    const a = computeAggregates([])
    expect(a.dayCount).toBe(0)
    expect(a.overallCompletion).toBe(0)
    expect(a.byWeekday).toEqual([])
    expect(a.sleepInsight).toBeNull()
  })

  it('computes completion + weekday bars for a single day', () => {
    const a = computeAggregates([day({ done: 3, total: 4, weekday: 1 })])
    expect(a.dayCount).toBe(1)
    expect(a.overallCompletion).toBe(75)
    expect(a.byWeekday).toEqual([{ label: 'Pon', rate: 75, n: 1 }])
    expect(a.sleepInsight).toBeNull() // needs >=2 low and >=2 high sleep days
  })

  it('surfaces the sleep insight when 7h+ days complete >=10pp more', () => {
    const days = [
      day({ sleep_hours: 6, done: 1, total: 4 }),
      day({ sleep_hours: 6, done: 1, total: 4 }),
      day({ sleep_hours: 8, done: 4, total: 4 }),
      day({ sleep_hours: 8, done: 4, total: 4 }),
    ]
    const a = computeAggregates(days)
    expect(a.sleepInsight).toContain('7h+')
  })
})
