import { describe, it, expect } from 'vitest'
import { formatScheduledLoad, summarizePriorityHistory } from '@/lib/ai/userContext'
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

describe('formatScheduledLoad', () => {
  it('nabraja svaki dan horizonta sa brojem zakazanih', () => {
    const out = formatScheduledLoad({}, 7)
    expect(out).toContain('dayOffset 0 (danas')
    expect(out).toContain('dayOffset 1 (sutra')
    expect(out).toContain('dayOffset 6 (za 6 dana')
    expect(out).toContain('već 0 zakazano')
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
