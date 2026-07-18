import { describe, it, expect } from 'vitest'
import { showsOnDay, scheduledOnDay, scheduledDateSet } from '@/lib/schedule'

const projekat = { for_date: '2026-08-01', deadline_date: '2026-08-05', repeat_id: null }
const bezRoka = { for_date: '2026-08-01', deadline_date: null, repeat_id: null }
const trening = { for_date: '2026-08-04', deadline_date: null, repeat_id: 'r1' }

describe('showsOnDay — projekat sa rokom zauzima ceo raspon', () => {
  it('vidi se svakog dana od početka do roka', () => {
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05']) {
      expect(showsOnDay(projekat, d)).toBe(true)
    }
  })

  it('ne vidi se pre početka ni posle roka', () => {
    expect(showsOnDay(projekat, '2026-07-31')).toBe(false)
    expect(showsOnDay(projekat, '2026-08-06')).toBe(false)
  })
})

describe('showsOnDay — namerna ograničenja', () => {
  it('bez roka: samo dan početka (da se ne razvuče unedogled)', () => {
    expect(showsOnDay(bezRoka, '2026-08-01')).toBe(true)
    expect(showsOnDay(bezRoka, '2026-08-02')).toBe(false)
  })

  it('pojavljivanje serije: samo svoj dan (propušten utorak se ne razliva)', () => {
    expect(showsOnDay(trening, '2026-08-04')).toBe(true)
    expect(showsOnDay(trening, '2026-08-05')).toBe(false)
  })
})

describe('scheduledOnDay', () => {
  it('vraća samo one koji tog dana važe', () => {
    const svi = [projekat, bezRoka, trening]
    expect(scheduledOnDay(svi, '2026-08-01')).toEqual([projekat, bezRoka])
    expect(scheduledOnDay(svi, '2026-08-04')).toEqual([projekat, trening])
    expect(scheduledOnDay(svi, '2026-08-06')).toEqual([])
  })
})

describe('scheduledDateSet — tačkice u mreži kalendara', () => {
  it('pokriva ceo raspon projekta', () => {
    expect([...scheduledDateSet([projekat])].sort()).toEqual([
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
    ])
  })

  it('bez roka i serija daju tačno jedan dan', () => {
    expect([...scheduledDateSet([bezRoka])]).toEqual(['2026-08-01'])
    expect([...scheduledDateSet([trening])]).toEqual(['2026-08-04'])
  })

  it('raspon preko granice meseca radi', () => {
    const preko = { for_date: '2026-08-30', deadline_date: '2026-09-02', repeat_id: null }
    expect([...scheduledDateSet([preko])].sort()).toEqual([
      '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
    ])
  })
})
