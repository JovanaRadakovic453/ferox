import { describe, it, expect } from 'vitest'
import { buildConsistencyWeeks, cellLevel } from '@/lib/consistency'

// Sreda, 2026-07-15 (getUTCDay = 3). Ponedeljak te nedelje = 2026-07-13.
const TODAY = '2026-07-15'

describe('buildConsistencyWeeks', () => {
  it('vraća matricu weeks × 7 (Pon..Ned), poslednja kolona = tekuća nedelja', () => {
    const w = buildConsistencyWeeks([], TODAY, 4)
    expect(w).toHaveLength(4)
    expect(w.every(col => col.length === 7)).toBe(true)
    // Prvi dan poslednje kolone je ponedeljak tekuće nedelje.
    expect(w[3][0].date_key).toBe('2026-07-13')
    // Danas je sreda → indeks 2 u poslednjoj koloni.
    expect(w[3][2].date_key).toBe(TODAY)
  })

  it('računa rate; dani bez plana su null; budući dani su future', () => {
    const w = buildConsistencyWeeks([
      { date_key: '2026-07-13', done: 3, total: 4 }, // 75%
      { date_key: '2026-07-14', done: 0, total: 2 }, // 0%
    ], TODAY, 1)
    const col = w[0]
    expect(col[0].rate).toBe(75)
    expect(col[1].rate).toBe(0)
    expect(col[2].rate).toBeNull()   // danas, bez plana
    expect(col[2].future).toBe(false)
    expect(col[3].future).toBe(true) // četvrtak je budućnost
  })
})

describe('cellLevel', () => {
  const cell = (rate: number | null, future = false) =>
    ({ date_key: 'x', done: 0, total: 0, rate, future })
  it('mapira % u 0..4', () => {
    expect(cellLevel(cell(null))).toBe(0)
    expect(cellLevel(cell(0))).toBe(0)
    expect(cellLevel(cell(20))).toBe(1)
    expect(cellLevel(cell(50))).toBe(2)
    expect(cellLevel(cell(90))).toBe(3)
    expect(cellLevel(cell(100))).toBe(4)
    expect(cellLevel(cell(100, true))).toBe(0) // budući dan je uvek prazan
  })
})
