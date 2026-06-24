// Centralizovano računanje "dana" u korisnikovoj vremenskoj zoni.
//
// Server (npr. Vercel) radi u UTC. Ranije se datum dana računao preko
// new Date().toISOString().split('T')[0] = UTC datum, pa su se server i
// klijent (Balkan, UTC+1/+2) razilazili oko ponoći → plan se snimi pod
// jednim date_key, a čita pod drugim → bacanje na praznu početnu.
//
// Fiksiramo zonu na Europe/Belgrade da bi i server i klijent uvek videli
// isti kalendarski dan kao korisnik.

const DAY_TZ = 'Europe/Belgrade'

// Vraća YYYY-MM-DD za dati trenutak u DAY_TZ. Format 'en-CA' je baš ISO datum.
export function dayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// Pomeri YYYY-MM-DD ključ za n dana (n može biti negativan).
// Sidrimo se na podne UTC tog datuma da DST i granica ponoći ne pomere dan.
export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return dayKey(d)
}

export function todayKey(): string {
  return dayKey()
}

export function tomorrowKey(): string {
  return addDays(todayKey(), 1)
}

// Validacija da je string ISPRAVAN kalendarski datum oblika YYYY-MM-DD.
// Ne samo regex (koji bi propustio 2024-13-45) nego i round-trip provera:
// napravimo Date u podne UTC i proverimo da dayKey vrati isti ključ.
export function isValidDayKey(key: string | undefined | null): key is string {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const d = new Date(`${key}T12:00:00Z`)
  return !isNaN(d.getTime()) && dayKey(d) === key
}
