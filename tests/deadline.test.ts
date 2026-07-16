import { describe, it, expect } from 'vitest'
import { getDeadlineBadge, daysUntil } from '@/lib/deadline'

const TODAY = '2026-07-16'

describe('daysUntil', () => {
  it('računa razliku u danima (negativno = prošlo)', () => {
    expect(daysUntil('2026-07-16', TODAY)).toBe(0)
    expect(daysUntil('2026-07-17', TODAY)).toBe(1)
    expect(daysUntil('2026-07-14', TODAY)).toBe(-2)
  })
})

describe('getDeadlineBadge', () => {
  it('prošao rok → crveno i hitno', () => {
    const b = getDeadlineBadge('2026-07-14', TODAY)
    expect(b.text).toContain('Rok prošao')
    expect(b.color).toBe('var(--danger)')
    expect(b.urgent).toBe(true)
  })

  it('rok danas → upozorenje i hitno', () => {
    const b = getDeadlineBadge(TODAY, TODAY)
    expect(b.text).toBe('Rok: danas')
    expect(b.color).toBe('var(--warn)')
    expect(b.urgent).toBe(true)
  })

  it('rok sutra → nije "hitno", ali je istaknut', () => {
    const b = getDeadlineBadge('2026-07-17', TODAY)
    expect(b.text).toBe('Rok: sutra')
    expect(b.urgent).toBe(false)
  })

  it('rok za nedelju dana → istaknut; daleko → prigušen', () => {
    expect(getDeadlineBadge('2026-07-22', TODAY).color).toBe('#f97316')
    expect(getDeadlineBadge('2026-09-01', TODAY).color).toBe('var(--text-muted)')
  })

  it('rok u drugoj godini prikazuje godinu', () => {
    expect(getDeadlineBadge('2027-01-10', TODAY).text).toContain('2027')
  })
})
