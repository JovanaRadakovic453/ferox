import { describe, it, expect } from 'vitest'
import { formatScheduledLoad, summarizePriorityHistory, weekdayName } from '@/lib/ai/userContext'
import { aiTaskSchema, aiAppointmentSchema } from '@/lib/validation'

describe('summarizePriorityHistory', () => {
  it('prazan ulaz → prazan sažetak', () => {
    expect(summarizePriorityHistory([])).toBe('')
  })

  it('grupiše primere po nivou prioriteta i ne duplira', () => {
    const out = summarizePriorityHistory([
      { name: 'Spremiti ispit', priority: 'high' },
      { name: 'Poslati izveštaj klijentu', priority: 'high' },
      { name: 'Odgovoriti na mejlove', priority: 'medium' },
      { name: 'Teretana', priority: 'low' },
      { name: 'Teretana', priority: 'low' },
    ])
    expect(out).toContain('visok: "Spremiti ispit", "Poslati izveštaj klijentu"')
    expect(out).toContain('srednji: "Odgovoriti na mejlove"')
    expect(out).toContain('nizak: "Teretana"')
    expect(out.match(/Teretana/g)?.length).toBe(1)
  })

  it('ignoriše nevažeći prioritet', () => {
    const out = summarizePriorityHistory([{ name: 'X', priority: 'urgent' }])
    expect(out).toBe('')
  })
})

describe('weekdayName', () => {
  it('vraća tačan srpski naziv dana', () => {
    expect(weekdayName('2026-07-16')).toBe('četvrtak') // Thu
    expect(weekdayName('2026-07-21')).toBe('utorak')   // Tue
    expect(weekdayName('2026-07-19')).toBe('nedelja')  // Sun
  })
})

describe('formatScheduledLoad', () => {
  it('nabraja svaki dan horizonta sa danom u nedelji i brojem zakazanih', () => {
    const out = formatScheduledLoad({}, 7)
    expect(out).toContain('dayOffset 0 = ')
    expect(out).toContain('(danas,')
    expect(out).toContain('dayOffset 6 = ')
    expect(out).toContain('već 0 zakazano')
    // svaki red ima validan naziv dana
    expect(out).toMatch(/dayOffset 0 = (ponedeljak|utorak|sreda|četvrtak|petak|subota|nedelja)/)
  })
})

describe('AI sheme — bezbedni default-i', () => {
  it('nevažeći dayOffset pada na default', () => {
    const parsed = aiTaskSchema.parse({
      name: 'Test', type: 'light', priority: 'medium', dayOffset: 99, reason: 'x',
    })
    expect(parsed.dayOffset).toBe(0)
  })
  it('appointment prima dayOffset', () => {
    const parsed = aiAppointmentSchema.parse({ name: 'Zubar', time: '11:00', dayOffset: 2 })
    expect(parsed.dayOffset).toBe(2)
    expect(parsed.time).toBe('11:00')
  })
})
