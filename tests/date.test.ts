import { describe, it, expect } from 'vitest'
import { isValidDayKey, addDays, dayKey, todayKey, tomorrowKey } from '@/lib/date'
import { calcSleepHours } from '@/lib/utils'

describe('dayKey timezone (Europe/Belgrade)', () => {
  it('rolls to the next day at the Belgrade midnight boundary (winter, UTC+1)', () => {
    expect(dayKey(new Date('2024-01-01T22:59:00Z'))).toBe('2024-01-01') // 23:59 Belgrade
    expect(dayKey(new Date('2024-01-01T23:00:00Z'))).toBe('2024-01-02') // 00:00 Belgrade next day
  })
  it('respects DST (summer, UTC+2)', () => {
    expect(dayKey(new Date('2024-07-01T21:59:00Z'))).toBe('2024-07-01') // 23:59 Belgrade
    expect(dayKey(new Date('2024-07-01T22:00:00Z'))).toBe('2024-07-02') // 00:00 Belgrade next day
  })
  it('tomorrowKey is addDays(todayKey(), 1)', () => {
    expect(tomorrowKey()).toBe(addDays(todayKey(), 1))
  })
})

describe('date validation', () => {
  it('rejects impossible dates', () => {
    expect(isValidDayKey('2024-13-45')).toBe(false)
    expect(isValidDayKey('2024-02-30')).toBe(false)
    expect(isValidDayKey('nope')).toBe(false)
  })
  it('accepts a valid date and crosses month on addDays', () => {
    expect(isValidDayKey('2024-06-24')).toBe(true)
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
  })
})

describe('sleep hours', () => {
  it('computes duration across midnight', () => {
    expect(calcSleepHours('23:00', '07:00')).toBe(8)
  })
})
