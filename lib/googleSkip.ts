/**
 * Google događaji koje je korisnik izbacio (✕) DOK je pravio plan.
 *
 * Problem: tada dan još ne postoji u bazi, pa nema gde da se upiše da je događaj
 * sklonjen. Zato ga do tada držimo u pregledaču, a čim se plan otvori pošaljemo
 * ga serveru — koji ga trajno zapamti na danu (`day_entries.google_dismissed`)
 * pa se događaj više ne uvlači.
 *
 * Sve je otporno na grešku: ako localStorage nije dostupan (privatni režim,
 * blokiran), tiho radimo bez pamćenja umesto da rušimo ekran.
 */

const key = (dateKey: string) => `ferox-google-skip-${dateKey}`

export function readSkipped(dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(key(dateKey))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch { return [] }
}

export function addSkipped(dateKey: string, eventId: string): void {
  try {
    const next = Array.from(new Set([...readSkipped(dateKey), eventId]))
    localStorage.setItem(key(dateKey), JSON.stringify(next))
  } catch { /* ignore */ }
}

export function clearSkipped(dateKey: string): void {
  try { localStorage.removeItem(key(dateKey)) } catch { /* ignore */ }
}
