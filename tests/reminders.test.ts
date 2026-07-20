import { describe, it, expect } from 'vitest'
import { reminderDue, reminderHourOf } from '@/lib/reminders'
import { hourInTimezone } from '@/lib/date'

// Jul 2026 = letnje računanje: Beograd UTC+2, Njujork UTC-4, Tokio UTC+9 (bez DST).

describe('hourInTimezone', () => {
  it('isti trenutak → različit sat po zoni', () => {
    const t = new Date('2026-07-18T06:00:00Z')
    expect(hourInTimezone('Europe/Belgrade', t)).toBe(8)
    expect(hourInTimezone('America/New_York', t)).toBe(2)
    expect(hourInTimezone('Asia/Tokyo', t)).toBe(15)
  })

  it('ponoć je 0, ne 24', () => {
    expect(hourInTimezone('Europe/Belgrade', new Date('2026-07-17T22:00:00Z'))).toBe(0)
  })

  it('nevažeća zona ne ruši — pada na Beograd', () => {
    expect(hourInTimezone('Izmisljena/Zona', new Date('2026-07-18T06:00:00Z'))).toBe(8)
  })
})

describe('reminderDue — svako u SVOM jutru', () => {
  it('u 06:00 UTC podsetnik ide Beogradu (08h kod njega), ne Njujorku ni Tokiju', () => {
    const t = new Date('2026-07-18T06:00:00Z')
    expect(reminderDue('Europe/Belgrade', null, t).due).toBe(true)
    expect(reminderDue('America/New_York', null, t).due).toBe(false)
    expect(reminderDue('Asia/Tokyo', null, t).due).toBe(false)
  })

  it('Tokio dobija svoje jutro — i to pod SVOJIM datumom (dan ispred UTC-a)', () => {
    const t = new Date('2026-07-17T23:00:00Z') // 08:00, 18. jul u Tokiju
    const tokyo = reminderDue('Asia/Tokyo', null, t)
    expect(tokyo.due).toBe(true)
    expect(tokyo.today).toBe('2026-07-18')
    // Beogradu je tad 01h — ne dira ga.
    expect(reminderDue('Europe/Belgrade', null, t).due).toBe(false)
  })

  it('Njujork dobija svoje jutro (12:00 UTC = 08h kod njega)', () => {
    const t = new Date('2026-07-18T12:00:00Z')
    expect(reminderDue('America/New_York', null, t).due).toBe(true)
    expect(reminderDue('Europe/Belgrade', null, t).due).toBe(false)
  })
})

describe('reminderHourOf — sat koji je korisnik izabrao', () => {
  it('čita sat iz HH:MM', () => {
    expect(reminderHourOf('06:30')).toBe(6)
    expect(reminderHourOf('09:00')).toBe(9)
  })

  it('prazno / smeće → podrazumevanih 8h (a NE ponoć)', () => {
    // `Number('')` je 0, ne NaN — zato ovo mora da bude pokriveno testom.
    expect(reminderHourOf('')).toBe(8)
    expect(reminderHourOf(null)).toBe(8)
    expect(reminderHourOf(undefined)).toBe(8)
    expect(reminderHourOf('kasnije')).toBe(8)
  })

  it('vreme van jutra se pritegne u dozvoljen opseg (5–11)', () => {
    expect(reminderHourOf('03:00')).toBe(5)
    expect(reminderHourOf('23:00')).toBe(11)
  })
})

describe('reminderDue — podsetnik poštuje izabrano vreme', () => {
  // Beograd je UTC+2 u julu.
  const utcFor = (belgradeHour: number) =>
    new Date(`2026-07-20T${String(belgradeHour - 2).padStart(2, '0')}:00:00Z`)

  it('ko izabere 06:00 dobija ga u 6, a ne u 8', () => {
    expect(reminderDue('Europe/Belgrade', null, utcFor(6), '06:00').due).toBe(true)
    // U 8h je već poslato (prozor 6–8), ali ključ dana to i inače zaustavlja.
    expect(reminderDue('Europe/Belgrade', null, utcFor(5), '06:00').due).toBe(false)
  })

  it('ko izabere 10:00 ne dobija ga u 8', () => {
    expect(reminderDue('Europe/Belgrade', null, utcFor(8), '10:00').due).toBe(false)
    expect(reminderDue('Europe/Belgrade', null, utcFor(10), '10:00').due).toBe(true)
  })

  it('tolerancija hvata zakašnjenje budilnika, ali ne ceo dan', () => {
    expect(reminderDue('Europe/Belgrade', null, utcFor(8), '06:00').due).toBe(true)  // +2h
    expect(reminderDue('Europe/Belgrade', null, utcFor(9), '06:00').due).toBe(false) // +3h → prekasno
  })
})

describe('reminderDue — prozor i zaštita od duplikata', () => {
  const belgradeAtLocal = (h: number) =>
    new Date(`2026-07-18T${String(h - 2).padStart(2, '0')}:00:00Z`) // UTC+2

  it('prerano (07h) i prekasno (11h) ne šalju', () => {
    expect(reminderDue('Europe/Belgrade', null, belgradeAtLocal(7)).due).toBe(false)
    expect(reminderDue('Europe/Belgrade', null, belgradeAtLocal(11)).due).toBe(false)
  })

  it('ceo prozor 08-10h šalje (da zakašnjenje budilnika nikoga ne preskoči)', () => {
    for (const h of [8, 9, 10]) {
      expect(reminderDue('Europe/Belgrade', null, belgradeAtLocal(h)).due).toBe(true)
    }
  })

  it('ko je danas već dobio — ne dobija ponovo (budilnik lupa svaki sat)', () => {
    const t = belgradeAtLocal(8)
    expect(reminderDue('Europe/Belgrade', '2026-07-18', t).due).toBe(false)
    // jučerašnji ključ ne blokira današnji podsetnik
    expect(reminderDue('Europe/Belgrade', '2026-07-17', t).due).toBe(true)
  })
})
