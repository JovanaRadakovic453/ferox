import { describe, it, expect } from 'vitest'
import { getDeadlineBadge, daysUntil, sortTasksForDay, dueTasks, deadlineReminderBody } from '@/lib/deadline'

const TODAY = '2026-07-16'

const t = (name: string, p: string, dl: string | null = null, done = false) =>
  ({ name, priority: p, deadline_date: dl, done })

describe('sortTasksForDay', () => {
  it('rok koji gori izbija na vrh, ispred prioriteta', () => {
    const out = sortTasksForDay([
      t('Visok bez roka', 'high'),
      t('Nizak sa rokom danas', 'low', TODAY),
      t('Srednji probijen rok', 'medium', '2026-07-14'),
    ], TODAY)
    expect(out.map(x => x.name)).toEqual([
      'Srednji probijen rok',   // rok prošao
      'Nizak sa rokom danas',   // rok danas
      'Visok bez roka',         // ostalo → prioritet
    ])
  })

  it('unutar iste hitnosti — raniji rok prvi', () => {
    const out = sortTasksForDay([
      t('B', 'low', '2026-07-13'),
      t('A', 'low', '2026-07-10'),
    ], TODAY)
    expect(out.map(x => x.name)).toEqual(['A', 'B'])
  })

  it('bez rokova — čist prioritet', () => {
    const out = sortTasksForDay([t('N', 'low'), t('V', 'high'), t('S', 'medium')], TODAY)
    expect(out.map(x => x.name)).toEqual(['V', 'S', 'N'])
  })

  it('završen zadatak ne skače na vrh iako mu je rok prošao', () => {
    const out = sortTasksForDay([t('Visok', 'high'), t('Gotov', 'low', '2026-07-10', true)], TODAY)
    expect(out[0].name).toBe('Visok')
  })
})

describe('dueTasks', () => {
  it('vraća samo nezavršene kojima rok ističe danas ili je prošao', () => {
    const out = dueTasks([
      t('Danas', 'low', TODAY),
      t('Prošao', 'low', '2026-07-10'),
      t('Sutra', 'high', '2026-07-17'),
      t('Gotov', 'low', '2026-07-10', true),
      t('Bez roka', 'high'),
    ], TODAY)
    expect(out.map(x => x.name)).toEqual(['Prošao', 'Danas'])
  })
})

describe('deadlineReminderBody', () => {
  it('prazno → nema poruke', () => {
    expect(deadlineReminderBody([], TODAY)).toBeNull()
  })
  it('rok danas → pominje zadatak imenom', () => {
    expect(deadlineReminderBody([{ name: 'Izveštaj šefu', deadline_date: TODAY }], TODAY))
      .toBe('⏳ Danas ističe rok: „Izveštaj šefu"')
  })
  it('probijen rok ima prednost i broji ostale', () => {
    const body = deadlineReminderBody([
      { name: 'Danasnji', deadline_date: TODAY },
      { name: 'Stari', deadline_date: '2026-07-10' },
    ], TODAY)
    expect(body).toBe('⚠️ Probijen rok: „Stari" (i još 1)')
  })
  it('na engleskom kad je locale en', () => {
    expect(deadlineReminderBody([{ name: 'Report', deadline_date: TODAY }], TODAY, 'en'))
      .toBe('⏳ Due today: "Report"')
    expect(deadlineReminderBody([
      { name: 'Today', deadline_date: TODAY },
      { name: 'Old', deadline_date: '2026-07-10' },
    ], TODAY, 'en')).toBe('⚠️ Overdue: "Old" (+1 more)')
  })
})

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
