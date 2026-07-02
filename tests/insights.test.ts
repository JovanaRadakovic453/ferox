import { describe, it, expect } from 'vitest'
import { computeAggregates, forecastTomorrow, type DayAgg } from '@/lib/insights'

function day(p: Partial<DayAgg> = {}): DayAgg {
  return {
    date_key: '2024-06-10',
    energy_level: 2,
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
    expect(a.byEnergy).toEqual([])
    expect(a.byWeekday).toEqual([])
    expect(a.byType).toEqual([])
    expect(a.sleepInsight).toBeNull()
  })

  it('computes completion + grouped bars for a single day', () => {
    const a = computeAggregates(
      [day({ energy_level: 1, done: 3, total: 4, weekday: 1 })],
      [{ type: 'analytical', done: 1, total: 2 }],
    )
    expect(a.dayCount).toBe(1)
    expect(a.overallCompletion).toBe(75)
    expect(a.byEnergy).toEqual([{ label: '🔥 (visoka)', rate: 75, n: 1 }])
    expect(a.byWeekday).toEqual([{ label: 'Pon', rate: 75, n: 1 }])
    expect(a.byType).toEqual([{ label: 'analytical', rate: 50, n: 2 }])
    expect(a.sleepInsight).toBeNull() // needs >=2 low and >=2 high sleep days
  })

  it('drops task types with zero total and sorts by rate desc', () => {
    const a = computeAggregates(
      [day()],
      [
        { type: 'admin', done: 0, total: 0 }, // dropped
        { type: 'light', done: 1, total: 4 }, // 25%
        { type: 'creative', done: 3, total: 4 }, // 75%
      ],
    )
    expect(a.byType.map(b => b.label)).toEqual(['creative', 'light'])
  })
})

describe('forecastTomorrow', () => {
  it('returns null with fewer than 3 leveled days', () => {
    expect(forecastTomorrow([], 1)).toBeNull()
    expect(forecastTomorrow([day(), day({ energy_level: null })], 1)).toBeNull()
  })

  it('blends same-weekday history when available', () => {
    const days = [day({ weekday: 1 }), day({ weekday: 1 }), day({ weekday: 1 })] // all level 2, Mon
    const f = forecastTomorrow(days, 1)!
    expect(f.level).toBe(2)
    expect(f.note).toBe('Na osnovu prethodnih sličnih dana.')
  })

  it('falls back to recent average with no same-weekday match', () => {
    const days = [day({ weekday: 2 }), day({ weekday: 2 }), day({ weekday: 2 })]
    const f = forecastTomorrow(days, 5)!
    expect(f.level).toBe(2)
    expect(f.note).toBe('Na osnovu poslednjih nekoliko dana.')
  })

  it('clamps the predicted level into [1,5]', () => {
    const allWorst = [day({ energy_level: 5 }), day({ energy_level: 5 }), day({ energy_level: 5 })]
    expect(forecastTomorrow(allWorst, 1)!.level).toBe(5)
    const allBest = [day({ energy_level: 1 }), day({ energy_level: 1 }), day({ energy_level: 1 })]
    expect(forecastTomorrow(allBest, 1)!.level).toBe(1)
  })

  it('raises confidence with more history', () => {
    const many = Array.from({ length: 10 }, () => day({ weekday: 1 }))
    expect(forecastTomorrow(many, 1)!.confidence).toBe('visoka')
    const some = Array.from({ length: 6 }, () => day({ weekday: 1 }))
    expect(forecastTomorrow(some, 1)!.confidence).toBe('srednja')
  })
})
