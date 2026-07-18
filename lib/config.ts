// Centralni izvor "podesivih" vrednosti (tunables) — jedna tačka istine za
// model, generativne parametre i produkt-default-e. Pre nego što hardkoduješ
// broj/string koji bi neko želeo da menja, dodaj ga ovde.
//
// ⚠️ Tajne NE idu ovde. API ključevi i service-role ostaju u process.env
// (vidi lib/anthropic.ts, lib/supabase/admin.ts). Ovde su samo ne-osetljive
// vrednosti (model id nije tajna). Named export-i su tree-shakeable, pa
// klijentski bundle koji uvozi DEFAULTS ne povlači AI/model stringove.

/** AI model + per-ruta generativni parametri i capovi. */
export const AI = {
  /** Jedna tačka za bump modela — menja se ovde, ne u 5 ruta. */
  model: 'claude-sonnet-4-6',
  /** max_tokens po ruti (kratke poruke = manji budžet = jeftinije). */
  maxTokens: {
    // Brain dump sada pravi ceo nedeljni plan (više stavki + kratka objašnjenja),
    // pa mu treba veći budžet nego za jednodnevni izvor.
    brainDump: 2048,
    eod: 200,
  },
  /** Najviše zadataka koje brain-dump izvuče (koristi se i u promptu i u .slice()). */
  brainDumpMaxTasks: 25,
  /** Koliko dana unapred brain dump raspoređuje (danas + narednih 7 = 8 dana).
   *  8 dana da svaki dan u nedelji ima NAREDNU pojavu u rasponu (npr. "u četvrtak"
   *  kad je danas četvrtak → sledeći četvrtak, dayOffset 7). */
  brainDumpHorizonDays: 8,
} as const

/**
 * Produkt default-i / podesive vrednosti UI-ja.
 * Namerno BEZ `as const`: ovo su numeričke vrednosti koje se koriste u
 * aritmetici i React stanju, pa treba da budu `number` (ne literal tip 15),
 * inače `useState` previše suzi tip stanja.
 */
export const DEFAULTS = {
  /** Pomodoro trajanje (min) + dozvoljeni opseg. */
  pomodoroMinutes: 25,
  pomodoroMin: 5,
  pomodoroMax: 90,
  /** Podrazumevani podsetnik za termin (min pre). */
  reminderMinutes: 15,
  /** Koliko dana unazad computeStreak gleda (≈ gornja granica niza). */
  streakLookbackDays: 400,
  /** History grafik: koliko dana prikazati (mobilni / desktop). */
  historyDaysMobile: 7,
  historyDaysDesktop: 14,
}

/**
 * Per-ruta rate limit (po korisniku) — sprečava neograničen trošak Anthropic
 * poziva / zloupotrebu brisanja naloga. Implementacija: lib/rateLimit.ts preko
 * Supabase rate_limit_hit funkcije (atomično, RLS-bezbedno). `limit` zahteva po
 * `windowSec` sekundi.
 */
export const RATE_LIMITS = {
  brainDump: { limit: 10, windowSec: 60 },
  eod: { limit: 10, windowSec: 60 },
  accountDelete: { limit: 3, windowSec: 86400 },
  /** CRUD mutacije (zaštita od DB bloat-a; GET liste ostaju bez limita). */
  scheduledWrite: { limit: 30, windowSec: 60 },
  notifications: { limit: 10, windowSec: 60 },
  /** Google Calendar proxy — štiti Google API kvotu aplikacije. */
  googleEvents: { limit: 30, windowSec: 60 },
} as const

/**
 * Jutarnji push podsetnik — kad sme da stigne, po LOKALNOM vremenu korisnika
 * (profiles.timezone), a ne po vremenu servera.
 *
 * Budilnik (.github/workflows/reminders.yml) lupa rutu svaki sat; ruta šalje samo
 * onima koji su u ovom prozoru. Prozor (a ne tačan sat) jer GitHub-ov budilnik ume
 * da kasni — tako zakašnjenje ne preskoči nikoga. Duplikat sprečava
 * profiles.last_reminder_key (vidi lib/reminders.ts).
 */
export const REMINDERS = {
  /** Od kog lokalnog sata (8 = 08:00 kod korisnika). */
  morningHour: 8,
  /** Do kog lokalnog sata zaključno (10 = do 10:59 kod korisnika). */
  latestHour: 10,
} as const

/** Statički identitet aplikacije / metapodaci. */
export const APP = {
  name: 'Ferox',
  tagline: 'Organizuj svoj dan i prati napredak.',
  title: 'Ferox — Tvoj lični planer',
  description:
    'Tvoj lični planer dana. Organizuj zadatke i prati napredak svakog dana.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const
