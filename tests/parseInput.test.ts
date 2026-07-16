import { describe, it, expect } from 'vitest'
import { parseInput } from '@/lib/parseInput'
import { todayKey, addDays } from '@/lib/date'

const today = todayKey()

describe('parseInput — dan', () => {
  it('prepoznaje "sutra"', () => {
    const r = parseInput('sutra kupiti hleb')
    expect(r.dateKey).toBe(addDays(today, 1))
    expect(r.name).toBe('Kupiti hleb')
  })

  it('prepoznaje "prekosutra"', () => {
    expect(parseInput('prekosutra pozvati mamu').dateKey).toBe(addDays(today, 2))
  })

  it('prepoznaje "danas"', () => {
    expect(parseInput('danas oprati kola').dateKey).toBe(today)
  })

  it('prepoznaje "za 3 dana"', () => {
    const r = parseInput('za 3 dana predati rad')
    expect(r.dateKey).toBe(addDays(today, 3))
    expect(r.name).toBe('Predati rad')
  })

  it('prepoznaje "za nedelju dana" (ne meša sa danom nedelja)', () => {
    const r = parseInput('za nedelju dana kontrola')
    expect(r.dateKey).toBe(addDays(today, 7))
    expect(r.name).toBe('Kontrola')
  })

  it('prepoznaje dan u nedelji i uvek gleda unapred', () => {
    const r = parseInput('u ponedeljak predaja rada')
    expect(r.dateKey > today).toBe(true)
    expect(new Date(`${r.dateKey}T12:00:00Z`).getUTCDay()).toBe(1)
    expect(r.name).toBe('Predaja rada')
  })

  it('radi i sa slovom č (četvrtak)', () => {
    const r = parseInput('u četvrtak vežbanje')
    expect(new Date(`${r.dateKey}T12:00:00Z`).getUTCDay()).toBe(4)
    expect(r.name).toBe('Vežbanje')
  })

  it('bez oznake dana → danas', () => {
    expect(parseInput('kupiti mleko').dateKey).toBe(today)
  })
})

describe('parseInput — vreme i tip', () => {
  it('"u 17h" → termin u 17:00', () => {
    const r = parseInput('sutra u 17h kod zubara')
    expect(r.time).toBe('17:00')
    expect(r.kind).toBe('appointment')
    expect(r.dateKey).toBe(addDays(today, 1))
    expect(r.name).toBe('Kod zubara')
  })

  it('"u 9:30" → 09:30', () => {
    const r = parseInput('danas u 9:30 sastanak')
    expect(r.time).toBe('09:30')
    expect(r.name).toBe('Sastanak')
  })

  it('bez vremena → zadatak', () => {
    const r = parseInput('kupiti hleb')
    expect(r.time).toBeNull()
    expect(r.kind).toBe('task')
  })

  it('"za 3 dana" se ne čita kao 3 sata', () => {
    expect(parseInput('za 3 dana pozvati mamu').time).toBeNull()
  })

  it('nemoguće vreme se ignoriše', () => {
    const r = parseInput('u 99 sati nesto')
    expect(r.time).toBeNull()
    expect(r.matched).not.toContain('vreme')
  })

  it('nemoguće vreme ostaje u nazivu (ne guta se tiho)', () => {
    const r = parseInput('sastanak u 99 sati')
    expect(r.time).toBeNull()
    expect(r.name).toBe('Sastanak u 99 sati')
    expect(r.kind).toBe('task')
  })
})

describe('parseInput — prioritet', () => {
  it('"hitno" → visok', () => {
    const r = parseInput('hitno poslati izveštaj')
    expect(r.priority).toBe('high')
    expect(r.name).toBe('Poslati izveštaj')
  })

  it('"nije hitno" → nizak (ne visok)', () => {
    const r = parseInput('nije hitno oprati kola')
    expect(r.priority).toBe('low')
    expect(r.name).toBe('Oprati kola')
  })

  it('podrazumevano → srednji', () => {
    expect(parseInput('kupiti mleko').priority).toBe('medium')
  })
})

describe('parseInput — sve zajedno', () => {
  it('spaja dan, vreme i prioritet, a naziv ostaje čist', () => {
    const r = parseInput('hitno sutra u 8:15 predati papire')
    expect(r.priority).toBe('high')
    expect(r.dateKey).toBe(addDays(today, 1))
    expect(r.time).toBe('08:15')
    expect(r.kind).toBe('appointment')
    expect(r.name).toBe('Predati papire')
    expect(r.matched).toEqual(expect.arrayContaining(['prioritet', 'dan', 'vreme']))
  })

  it('interpunkcija ne smeta', () => {
    const r = parseInput('sutra, u 17h, kod zubara!')
    expect(r.time).toBe('17:00')
    expect(r.name).toBe('Kod zubara')
  })

  it('prazan naziv ne ruši parser', () => {
    const r = parseInput('sutra')
    expect(r.name).toBe('')
    expect(r.dateKey).toBe(addDays(today, 1))
  })
})
