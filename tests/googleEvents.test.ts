import { describe, it, expect } from 'vitest'

// Ista logika izbora događaja kao u app/api/integrations/google/events/route.ts.
// Izdvojena ovde da se pravilo (naročito EKSKLUZIVAN end.date kod celodnevnih)
// zaključa testom — ta greška je ranije tiho gutala celodnevne događaje.
type RawEvent = { id: string; summary?: string; start?: Record<string, string>; end?: Record<string, string> }
type GEvent = { id: string; title: string; time: string | null; endTime: string | null; allDay: boolean }

function pickEvents(items: RawEvent[], date: string): GEvent[] {
  return items
    .map((e): GEvent | null => {
      const start = e.start
      const end = e.end
      const id = e.id
      const title = e.summary ?? 'Bez naziva'

      if (start?.dateTime) {
        if (start.dateTime.slice(0, 10) !== date) return null
        return {
          id, title,
          time: start.dateTime.slice(11, 16),
          endTime: end?.dateTime ? end.dateTime.slice(11, 16) : null,
          allDay: false,
        }
      }
      if (start?.date) {
        const from = start.date
        const to = end?.date
        const inRange = to ? from <= date && date < to : from === date
        if (!inRange) return null
        return { id, title, time: null, endTime: null, allDay: true }
      }
      return null
    })
    .filter((e): e is GEvent => e !== null)
}

const DAY = '2026-07-18'

describe('izbor Google događaja', () => {
  it('uzima događaj sa vremenom tog dana', () => {
    const out = pickEvents([
      { id: '1', summary: 'Proba', start: { dateTime: `${DAY}T16:00:00+02:00` }, end: { dateTime: `${DAY}T17:00:00+02:00` } },
    ], DAY)
    expect(out).toEqual([{ id: '1', title: 'Proba', time: '16:00', endTime: '17:00', allDay: false }])
  })

  it('uzima CELODNEVNI događaj (end.date je ekskluzivan)', () => {
    const out = pickEvents([
      { id: '2', summary: 'Godišnji', start: { date: DAY }, end: { date: '2026-07-19' } },
    ], DAY)
    expect(out).toEqual([{ id: '2', title: 'Godišnji', time: null, endTime: null, allDay: true }])
  })

  it('višednevni celodnevni se vidi na svakom svom danu, ali ne posle kraja', () => {
    const ev: RawEvent = { id: '3', summary: 'Put', start: { date: '2026-07-17' }, end: { date: '2026-07-19' } }
    expect(pickEvents([ev], '2026-07-17')).toHaveLength(1)
    expect(pickEvents([ev], '2026-07-18')).toHaveLength(1)
    expect(pickEvents([ev], '2026-07-19')).toHaveLength(0) // kraj je ekskluzivan
  })

  it('preskače događaje drugog dana', () => {
    const out = pickEvents([
      { id: '4', summary: 'Juče', start: { dateTime: '2026-07-17T16:00:00+02:00' } },
      { id: '5', summary: 'Sutra celodnevni', start: { date: '2026-07-19' }, end: { date: '2026-07-20' } },
    ], DAY)
    expect(out).toEqual([])
  })

  it('bez naziva dobija podrazumevani naslov', () => {
    const out = pickEvents([{ id: '6', start: { date: DAY }, end: { date: '2026-07-19' } }], DAY)
    expect(out[0].title).toBe('Bez naziva')
  })
})
