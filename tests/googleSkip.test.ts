import { describe, it, expect, beforeEach } from 'vitest'
import { readSkipped, addSkipped, clearSkipped } from '@/lib/googleSkip'

// Lazni localStorage — modul mora da radi i van pregledaca.
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => { map.clear() },
    key: () => null,
    get length() { return map.size },
  } as Storage
}

const DAY = '2026-07-18'

describe('googleSkip', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = fakeStorage()
  })

  it('prazno dok nista nije izbaceno', () => {
    expect(readSkipped(DAY)).toEqual([])
  })

  it('pamti izbaceno i ne duplira', () => {
    addSkipped(DAY, 'a')
    addSkipped(DAY, 'a')
    addSkipped(DAY, 'b')
    expect(readSkipped(DAY)).toEqual(['a', 'b'])
  })

  it('svaki dan ima svoj spisak', () => {
    addSkipped(DAY, 'a')
    expect(readSkipped('2026-07-19')).toEqual([])
  })

  it('ciscenje prazni spisak (posle upisa na server)', () => {
    addSkipped(DAY, 'a')
    clearSkipped(DAY)
    expect(readSkipped(DAY)).toEqual([])
  })

  it('pokvaren sadrzaj ne rusi ekran', () => {
    localStorage.setItem(`ferox-google-skip-${DAY}`, '{nije json')
    expect(readSkipped(DAY)).toEqual([])
  })

  it('radi i kad localStorage uopste ne postoji', () => {
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage
    expect(readSkipped(DAY)).toEqual([])
    expect(() => addSkipped(DAY, 'a')).not.toThrow()
    expect(() => clearSkipped(DAY)).not.toThrow()
  })
})
