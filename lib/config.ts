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
    chat: 1024,
    brainDump: 1024,
    replan: 1024,
    insights: 600,
    eod: 200,
  },
  /** Budžet konteksta dana (u karakterima) u chat system promptu. */
  chatContextChars: 4000,
  /** Najviše zadataka koje brain-dump izvuče (koristi se i u promptu i u .slice()). */
  brainDumpMaxTasks: 8,
  /** Najviše uvida koje Pattern Coach vrati. */
  insightsMax: 3,
} as const

/**
 * Produkt default-i / podesive vrednosti UI-ja.
 * Namerno BEZ `as const`: ovo su numeričke vrednosti koje se koriste u
 * aritmetici i React stanju, pa treba da budu `number` (ne literal tip 15),
 * inače `useState` previše suzi tip stanja.
 */
export const DEFAULTS = {
  /** Dnevni cilj unosa vode (ml). */
  waterGoalMl: 2000,
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
  /** Insights: koliko najboljih tipova zadatka prikazati u grafiku. */
  insightsTopTaskTypes: 6,
}

/**
 * Per-ruta rate limit (po korisniku) — sprečava neograničen trošak Anthropic
 * poziva / zloupotrebu brisanja naloga. Implementacija: lib/rateLimit.ts preko
 * Supabase rate_limit_hit funkcije (atomično, RLS-bezbedno). `limit` zahteva po
 * `windowSec` sekundi.
 */
export const RATE_LIMITS = {
  chat: { limit: 20, windowSec: 60 },
  brainDump: { limit: 10, windowSec: 60 },
  replan: { limit: 10, windowSec: 60 },
  eod: { limit: 10, windowSec: 60 },
  insights: { limit: 10, windowSec: 300 },
  accountDelete: { limit: 3, windowSec: 86400 },
} as const

/** Statički identitet aplikacije / metapodaci. */
export const APP = {
  name: 'Ferox',
  tagline: 'Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi.',
  title: 'Ferox — Planer prema energiji',
  description:
    'Energy-adaptive daily planner. Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi. Ferox pomera tvoj raspored prema energiji koju ćeš stvarno imati.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const
