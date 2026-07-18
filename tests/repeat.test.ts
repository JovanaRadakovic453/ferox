import { describe, it, expect } from 'vitest'
import {
  matchesRepeat, repeatOccurrences, weekdayOf, daysInMonthOf, isUsableRule,
  type RepeatRule,
} from '@/lib/repeat'

// Sidro: 2026-07-18 je SUBOTA. Odatle: 20. pon, 21. uto, 22. sre, 23. čet, 24. pet.

describe('weekdayOf / daysInMonthOf', () => {
  it('tačan dan u nedelji (0=nedelja … 6=subota)', () => {
    expect(weekdayOf('2026-07-18')).toBe(6) // subota
    expect(weekdayOf('2026-07-19')).toBe(0) // nedelja
    expect(weekdayOf('2026-07-20')).toBe(1) // ponedeljak
  })

  it('tačan broj dana u mesecu, uključujući prestupnu godinu', () => {
    expect(daysInMonthOf('2026-02-10')).toBe(28)
    expect(daysInMonthOf('2028-02-10')).toBe(29) // 2028 je prestupna
    expect(daysInMonthOf('2026-04-10')).toBe(30)
    expect(daysInMonthOf('2026-12-10')).toBe(31)
  })
})

describe('svaki dan / radnim danima', () => {
  const from = '2026-07-18', to = '2026-07-26'

  it('svaki dan vraća baš svaki dan', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2026-01-01' }
    expect(repeatOccurrences(r, from, to)).toHaveLength(9)
  })

  it('radnim danima preskače subotu i nedelju', () => {
    const r: RepeatRule = { freq: 'weekdays', startDate: '2026-01-01' }
    expect(repeatOccurrences(r, from, to)).toEqual([
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
    ])
  })
})

describe('određenim danima u nedelji', () => {
  it('"svakog utorka" pogađa samo utorke', () => {
    const r: RepeatRule = { freq: 'weekly', weekdays: [2], startDate: '2026-01-01' }
    expect(repeatOccurrences(r, '2026-07-18', '2026-08-15')).toEqual([
      '2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11',
    ])
  })

  it('može više dana odjednom (pon + čet)', () => {
    const r: RepeatRule = { freq: 'weekly', weekdays: [1, 4], startDate: '2026-01-01' }
    expect(repeatOccurrences(r, '2026-07-18', '2026-07-26')).toEqual([
      '2026-07-20', '2026-07-23',
    ])
  })
})

describe('mesečno — kritični deo (kraj meseca)', () => {
  it('običan dan u mesecu: jednom mesečno', () => {
    const r: RepeatRule = { freq: 'monthly', monthDay: 15, startDate: '2026-01-01' }
    expect(repeatOccurrences(r, '2026-07-01', '2026-09-30')).toEqual([
      '2026-07-15', '2026-08-15', '2026-09-15',
    ])
  })

  it('"svakog 31." se pomera na poslednji dan meseca — ne preskače mesec', () => {
    const r: RepeatRule = { freq: 'monthly', monthDay: 31, startDate: '2026-01-01' }
    expect(repeatOccurrences(r, '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-31', // 31 dan
      '2026-02-28', // februar nema 31 → poslednji
      '2026-03-31',
      '2026-04-30', // april ima 30 → poslednji
      '2026-05-31',
      '2026-06-30',
    ])
  })

  it('u prestupnoj godini februar hvata 29.', () => {
    const r: RepeatRule = { freq: 'monthly', monthDay: 31, startDate: '2028-01-01' }
    expect(repeatOccurrences(r, '2028-02-01', '2028-02-29')).toEqual(['2028-02-29'])
  })
})

describe('početak, kraj i zaštita', () => {
  it('ne pravi ništa pre početnog datuma', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2026-07-22' }
    expect(repeatOccurrences(r, '2026-07-18', '2026-07-24')).toEqual([
      '2026-07-22', '2026-07-23', '2026-07-24',
    ])
  })

  it('prestaje posle krajnjeg datuma', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2026-07-01', endDate: '2026-07-20' }
    expect(repeatOccurrences(r, '2026-07-18', '2026-07-31')).toEqual([
      '2026-07-18', '2026-07-19', '2026-07-20',
    ])
    expect(matchesRepeat(r, '2026-07-21')).toBe(false)
  })

  it('projekat na kom se radi pomalo: svaki dan od 1. do 5. = tačno 5 dana', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2026-08-01', endDate: '2026-08-05' }
    expect(repeatOccurrences(r, '2026-08-01', '2026-12-31')).toEqual([
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
    ])
    // i ništa posle roka
    expect(matchesRepeat(r, '2026-08-06')).toBe(false)
  })

  it('cap štiti bazu od neograničenog broja redova', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2020-01-01' }
    expect(repeatOccurrences(r, '2020-01-01', '2030-01-01', 30)).toHaveLength(30)
  })

  it('besmislen datum ne ruši — vraća prazno', () => {
    const r: RepeatRule = { freq: 'daily', startDate: '2026-02-30' }
    expect(repeatOccurrences(r, '2026-13-45', '2026-07-20')).toEqual([])
    expect(matchesRepeat(r, '2026-07-20')).toBe(false)
  })
})

describe('isUsableRule — šta sme da se sačuva', () => {
  it('prihvata ispravna pravila', () => {
    expect(isUsableRule({ freq: 'daily', startDate: '2026-07-18' })).toBe(true)
    expect(isUsableRule({ freq: 'weekly', weekdays: [1, 3], startDate: '2026-07-18' })).toBe(true)
    expect(isUsableRule({ freq: 'monthly', monthDay: 1, startDate: '2026-07-18' })).toBe(true)
  })

  it('odbija nedeljno bez izabranog dana i mesečno bez datuma', () => {
    expect(isUsableRule({ freq: 'weekly', weekdays: [], startDate: '2026-07-18' })).toBe(false)
    expect(isUsableRule({ freq: 'monthly', startDate: '2026-07-18' })).toBe(false)
  })

  it('odbija kraj pre početka', () => {
    expect(isUsableRule({
      freq: 'daily', startDate: '2026-07-18', endDate: '2026-07-01',
    })).toBe(false)
  })
})
