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

describe('dayKey with explicit timezone (faza 3)', () => {
  it('isti trenutak je različit kalendarski dan u različitim zonama', () => {
    // 02:00 UTC = 22:00 prethodnog dana u Njujorku (leto, UTC-4),
    // ali 04:00 istog dana u Beogradu (UTC+2) i 11:00 u Tokiju (UTC+9)
    const m = new Date('2026-07-18T02:00:00Z')
    expect(dayKey(m, 'America/New_York')).toBe('2026-07-17')
    expect(dayKey(m, 'Europe/Belgrade')).toBe('2026-07-18')
    expect(dayKey(m, 'Asia/Tokyo')).toBe('2026-07-18')
  })
  it('bez prosleđene zone → Beograd (nepromenjeno ponašanje)', () => {
    expect(dayKey(new Date('2024-01-01T23:00:00Z'))).toBe('2024-01-02')
  })
  it('todayKey(tz) vraća današnji dan u toj zoni', () => {
    // ne znamo tačan dan, ali mora biti ispravan ključ i poklapati se sa dayKey
    const now = new Date()
    expect(todayKey('America/New_York')).toBe(dayKey(now, 'America/New_York'))
    expect(isValidDayKey(todayKey('Pacific/Auckland'))).toBe(true)
  })
})

describe('addDays je nezavistan od zone (čista UTC matematika)', () => {
  it('daje isti rezultat bez obzira na proces/zonu, i za ekstreme', () => {
    expect(addDays('2026-07-18', 1)).toBe('2026-07-19')
    expect(addDays('2026-07-18', -1)).toBe('2026-07-17')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // prestupna
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
