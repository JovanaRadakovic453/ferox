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
    const a = computeAggregates([], [])
    expect(a.dayCount).toBe(0)
    expect(a.overallCompletion).toBe(0)
    expect(a.byWeekday).toEqual([])
    expect(a.byType).toEqual([])
    expect(a.sleepInsight).toBeNull()
  })

  it('computes completion + grouped bars for a single day', () => {
    const a = computeAggregates(
      [day({ done: 3, total: 4, weekday: 1 })],
      [{ type: 'analytical', done: 1, total: 2 }],
    )
    expect(a.dayCount).toBe(1)
    expect(a.overallCompletion).toBe(75)
    expect(a.byWeekday).toEqual([{ label: 'Pon', rate: 75, n: 1 }])
    expect(a.byType).toEqual([{ label: '🧠 Analitičko', rate: 50, n: 2 }])
    expect(a.sleepInsight).toBeNull() // needs >=2 low and >=2 high sleep days
  })

  it('drops task types with zero total and sorts by rate desc (srpske labele)', () => {
    const a = computeAggregates(
      [day()],
      [
        { type: 'admin', done: 0, total: 0 }, // dropped
        { type: 'light', done: 1, total: 4 }, // 25%
        { type: 'creative', done: 3, total: 4 }, // 75%
      ],
    )
    expect(a.byType.map(b => b.label)).toEqual(['🎨 Kreativno', '🌿 Lagano'])
  })

  it('caps byType to the configured top-N', () => {
    const many = (['creative', 'analytical', 'meetings', 'communication', 'admin', 'light', 'rest', 'learning'] as const)
      .map((type, i) => ({ type, done: i, total: 8 }))
    const a = computeAggregates([day()], [...many])
    expect(a.byType.length).toBeLessThanOrEqual(6)
  })

  it('surfaces the sleep insight when 7h+ days complete >=10pp more', () => {
    const days = [
      day({ sleep_hours: 6, done: 1, total: 4 }),
      day({ sleep_hours: 6, done: 1, total: 4 }),
      day({ sleep_hours: 8, done: 4, total: 4 }),
      day({ sleep_hours: 8, done: 4, total: 4 }),
    ]
    const a = computeAggregates(days, [])
    expect(a.sleepInsight).toContain('7h+')
  })
})
