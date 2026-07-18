import { describe, it, expect } from 'vitest'
import { pickEventsForDay } from '@/lib/google'

// Pravilo izbora događaja — naročito EKSKLUZIVAN end.date kod celodnevnih, što
// je ranije tiho gutalo celodnevne događaje.
const DAY = '2026-07-18'

describe('pickEventsForDay', () => {
  it('uzima događaj sa vremenom tog dana (početak i kraj)', () => {
    const out = pickEventsForDay([
      { id: '1', summary: 'Sastanak', start: { dateTime: `${DAY}T16:00:00+02:00` }, end: { dateTime: `${DAY}T18:00:00+02:00` } },
    ], DAY)
    expect(out).toEqual([{ id: '1', title: 'Sastanak', time: '16:00', endTime: '18:00', allDay: false }])
  })

  it('uzima CELODNEVNI događaj (end.date je ekskluzivan)', () => {
    const out = pickEventsForDay([
      { id: '2', summary: 'Godišnji', start: { date: DAY }, end: { date: '2026-07-19' } },
    ], DAY)
    expect(out).toEqual([{ id: '2', title: 'Godišnji', time: null, endTime: null, allDay: true }])
  })

  it('višednevni celodnevni se vidi na svakom svom danu, ali ne posle kraja', () => {
    const ev = { id: '3', summary: 'Put', start: { date: '2026-07-17' }, end: { date: '2026-07-19' } }
    expect(pickEventsForDay([ev], '2026-07-17')).toHaveLength(1)
    expect(pickEventsForDay([ev], '2026-07-18')).toHaveLength(1)
    expect(pickEventsForDay([ev], '2026-07-19')).toHaveLength(0) // kraj je ekskluzivan
  })

  it('preskače događaje drugog dana', () => {
    const out = pickEventsForDay([
      { id: '4', summary: 'Juče', start: { dateTime: '2026-07-17T16:00:00+02:00' } },
      { id: '5', summary: 'Sutra celodnevni', start: { date: '2026-07-19' }, end: { date: '2026-07-20' } },
    ], DAY)
    expect(out).toEqual([])
  })

  it('bez naziva dobija podrazumevani naslov', () => {
    const out = pickEventsForDay([{ id: '6', start: { date: DAY }, end: { date: '2026-07-19' } }], DAY)
    expect(out[0].title).toBe('Bez naziva')
  })

  it('u plan se uvlače samo događaji SA VREMENOM (celodnevni nemaju vreme)', () => {
    const out = pickEventsForDay([
      { id: '7', summary: 'Sa vremenom', start: { dateTime: `${DAY}T09:00:00+02:00` } },
      { id: '8', summary: 'Celodnevni', start: { date: DAY }, end: { date: '2026-07-19' } },
    ], DAY)
    expect(out.filter(e => e.time).map(e => e.id)).toEqual(['7'])
  })
})
