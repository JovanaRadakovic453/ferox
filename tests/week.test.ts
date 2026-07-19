import { describe, it, expect } from 'vitest'
import { mondayIndex, isSundayKey } from '@/lib/week'

// Sidro: 2026-07-18 je SUBOTA, 2026-07-19 NEDELJA, 2026-07-20 PONEDELJAK.

describe('mondayIndex — nedelja ide pon(0) → ned(6)', () => {
  it('ponedeljak je 0, nedelja je 6', () => {
    expect(mondayIndex('2026-07-20')).toBe(0) // pon
    expect(mondayIndex('2026-07-18')).toBe(5) // sub
    expect(mondayIndex('2026-07-19')).toBe(6) // ned
  })
})

describe('isSundayKey — kad se nedelja zaokružuje', () => {
  it('hvata baš nedelju', () => {
    expect(isSundayKey('2026-07-19')).toBe(true)
    expect(isSundayKey('2026-07-26')).toBe(true)
  })

  it('ostali dani nisu kraj nedelje', () => {
    for (const d of ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25']) {
      expect(isSundayKey(d)).toBe(false)
    }
  })

  it('radi i preko granice godine', () => {
    expect(isSundayKey('2026-12-27')).toBe(true)  // nedelja
    expect(isSundayKey('2027-01-03')).toBe(true)  // nedelja
    expect(isSundayKey('2026-12-31')).toBe(false) // četvrtak
  })
})
