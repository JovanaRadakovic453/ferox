// Zadaci koji se ponavljaju — računanje DATUMA pojavljivanja.
//
// Namerno čista funkcija nad `YYYY-MM-DD` ključevima: bez baze, bez zone, bez
// `new Date()` nad "sada". Zato je testabilno i daje isti rezultat u svakoj
// vremenskoj zoni (ista logika kao `addDays` u lib/date.ts — čista UTC matematika).
//
// Model: pravilo NE zamenjuje zakazane zadatke — ono ih PRAVI. Svako pojavljivanje
// postaje običan red u `scheduled_tasks`, pa kalendar, plan dana, rokovi i
// podsetnici rade bez ijedne izmene. Korisnik može da obriše jedno pojavljivanje
// ("preskoči ovu nedelju") a da serija ostane.

import { addDays, isValidDayKey } from '@/lib/date'

export const REPEAT_FREQS = ['daily', 'weekdays', 'weekly', 'monthly'] as const
export type RepeatFreq = (typeof REPEAT_FREQS)[number]

export type RepeatRule = {
  freq: RepeatFreq
  /** Za 'weekly': koji dani u nedelji. 0 = nedelja … 6 = subota. */
  weekdays?: number[]
  /** Za 'monthly': koji dan u mesecu (1-31). */
  monthDay?: number | null
  /** Od kad pravilo važi (uključivo). */
  startDate: string
  /** Do kad važi (uključivo). null = bez kraja. */
  endDate?: string | null
}

/** Dan u nedelji za ključ: 0 = nedelja … 6 = subota. Čist UTC — bez zone. */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Koliko dana ima mesec kom pripada ključ. */
export function daysInMonthOf(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate() // dan 0 sledećeg meseca = poslednji ovog
}

/**
 * Da li pravilo pogađa taj dan.
 *
 * Mesečno: ako mesec nema traženi dan (npr. 31. u februaru), pomera se na
 * POSLEDNJI dan tog meseca — da "svakog 31." ne bi tiho preskočilo pola godine.
 */
export function matchesRepeat(rule: RepeatRule, key: string): boolean {
  if (!isValidDayKey(key) || !isValidDayKey(rule.startDate)) return false
  if (key < rule.startDate) return false
  if (rule.endDate && key > rule.endDate) return false

  switch (rule.freq) {
    case 'daily':
      return true
    case 'weekdays': {
      const wd = weekdayOf(key)
      return wd >= 1 && wd <= 5 // pon-pet
    }
    case 'weekly':
      return (rule.weekdays ?? []).includes(weekdayOf(key))
    case 'monthly': {
      const want = rule.monthDay
      if (!want || want < 1 || want > 31) return false
      const dom = Number(key.split('-')[2])
      const last = daysInMonthOf(key)
      return dom === Math.min(want, last)
    }
    default:
      return false
  }
}

/**
 * Svi datumi pojavljivanja u opsegu [from, to] (uključivo).
 *
 * `cap` je zaštita: pravilo "svaki dan" na dugom opsegu ne sme da napravi
 * neograničeno redova u bazi.
 */
export function repeatOccurrences(
  rule: RepeatRule,
  from: string,
  to: string,
  cap = 400,
): string[] {
  if (!isValidDayKey(from) || !isValidDayKey(to) || from > to) return []

  // Ne vrti dane pre početka pravila — samo trošak.
  let cursor = from < rule.startDate ? rule.startDate : from
  const end = rule.endDate && rule.endDate < to ? rule.endDate : to

  const out: string[] = []
  while (cursor <= end && out.length < cap) {
    if (matchesRepeat(rule, cursor)) out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

/** Kratak opis pravila za proveru/ispis (npr. u testovima i logovima). */
export function isUsableRule(rule: RepeatRule): boolean {
  if (!REPEAT_FREQS.includes(rule.freq)) return false
  if (!isValidDayKey(rule.startDate)) return false
  if (rule.endDate && (!isValidDayKey(rule.endDate) || rule.endDate < rule.startDate)) return false
  if (rule.freq === 'weekly') {
    const wd = rule.weekdays ?? []
    return wd.length > 0 && wd.every(d => Number.isInteger(d) && d >= 0 && d <= 6)
  }
  if (rule.freq === 'monthly') {
    const d = rule.monthDay
    return typeof d === 'number' && d >= 1 && d <= 31
  }
  return true
}
