// Centralizovano računanje "dana" u korisnikovoj vremenskoj zoni.
//
// Server (npr. Vercel) radi u UTC. Datum dana MORA da se računa u zoni korisnika,
// inače se server i klijent razilaze oko ponoći → plan se snimi pod jednim
// date_key, a čita pod drugim → bacanje na praznu početnu.
//
// KLJUČNO (faza 3 — višezonskost):
//  • Zona utiče SAMO na "koji je danas dan" (dayKey/todayKey/tomorrowKey).
//  • Pomeranje datuma (addDays) i validacija (isValidDayKey) su ČISTA UTC
//    matematika nad stringom — NE zavise od zone (isti rezultat u svakoj zoni,
//    uključujući ekstreme kao NZ UTC+13). Zato ih zona ne sme dodirivati.
//  • Podrazumevana zona je Beograd: svaki poziv bez prosleđene zone ponaša se
//    tačno kao pre. Zonu korisnika prosleđujemo eksplicitno (server iz profila,
//    klijent iz TimezoneProvider-a) — i server i klijent iz ISTOG izvora, da se
//    "danas" uvek poklopi.

export const DEFAULT_TZ = 'Europe/Belgrade'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Da li je string ispravna IANA zona (npr. 'America/New_York'). Nevažeća zona
// baci u Intl-u — hvatamo i vraćamo false.
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// Sve što nije ispravna zona → Beograd (stari profili, prazna kolona, smeće).
export function toTimezone(value: unknown): string {
  return isValidTimezone(value) ? value : DEFAULT_TZ
}

// Zona iz pregledača — istina o tome gde je korisnik. Koristi se za PREPOZNAVANJE
// (upis u profil), ne za direktno računanje, da se server i klijent ne raziđu.
export function detectTimezone(): string {
  if (typeof Intl === 'undefined') return DEFAULT_TZ
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ
  } catch {
    return DEFAULT_TZ
  }
}

// Vraća YYYY-MM-DD za dati trenutak u zoni `tz`. Format 'en-CA' je baš ISO datum.
export function dayKey(d: Date = new Date(), tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// Pomeri YYYY-MM-DD ključ za n dana (n može biti negativan).
// Čista UTC kalendarska matematika — bez zone, tačno u svakoj zoni.
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function todayKey(tz: string = DEFAULT_TZ): string {
  return dayKey(new Date(), tz)
}

export function tomorrowKey(tz: string = DEFAULT_TZ): string {
  return addDays(todayKey(tz), 1)
}

// Validacija da je string ISPRAVAN kalendarski datum oblika YYYY-MM-DD.
// Round-trip preko UTC (bez zone): napravi datum pa proveri da se isti string vrati.
// Tako "2024-02-30" (→ 1. mart) i "2024-13-45" otpadaju.
export function isValidDayKey(key: string | undefined | null): key is string {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return !isNaN(dt.getTime()) &&
    `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}` === key
}
