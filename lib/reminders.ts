// Odluka "da li OVOM korisniku SADA treba poslati jutarnji podsetnik".
//
// Izdvojeno iz rute da bude čista funkcija (bez baze i mreže) — pa može da se
// testira sa lažnim `now` i raznim zonama (tests/reminders.test.ts).
//
// Dva uslova moraju oba da važe:
//  1) kod korisnika je JUTRO — lokalni sat je u prozoru REMINDERS.morningHour..latestHour
//  2) tog (svog, lokalnog) dana još nije dobio podsetnik — last_reminder_key !== today
//
// Uslov 2 je ono što dozvoljava da budilnik lupa svaki sat bez spamovanja: prvi
// pogodak u prozoru pošalje, ostali u istom danu preskoče.

import { hourInTimezone, dayKey, toTimezone } from '@/lib/date'
import { REMINDERS } from '@/lib/config'
import { toLocale } from '@/lib/locale'
import type { Locale } from '@/types/ferox'

// Tekstovi push poruka po jeziku korisnika (profiles.locale). Server-side pandan
// UI rečniku — push ne ide kroz React pa ne može kroz useT.
const PUSH_TEXT: Record<Locale, { morning: string; test: string }> = {
  sr: {
    morning: 'Dobro jutro! Vreme je da napraviš plan za danas.',
    test: 'Test uspešan! Dobijaćeš ovakve podsetnike svako jutro.',
  },
  en: {
    morning: 'Good morning! Time to plan your day.',
    test: 'Test successful! You will get reminders like this every morning.',
  },
}

/** Push tekstovi na jeziku korisnika; sve nepoznato → srpski. */
export function pushText(locale: unknown): { morning: string; test: string } {
  return PUSH_TEXT[toLocale(locale)]
}

export type ReminderCheck = {
  /** Lokalni datum korisnika (YYYY-MM-DD) — pod njim se pamti da je poslato. */
  today: string
  /** Lokalni sat korisnika (0-23). */
  hour: number
  /** Da li sada treba poslati. */
  due: boolean
}

/**
 * Sat iz `profiles.reminder_time` ('HH:MM'). Prazno/smeće → podrazumevani sat.
 * Vrednost van jutarnjeg opsega se pritegne, da pokvaren podatak ne pošalje
 * podsetnik u ponoć.
 */
export function reminderHourOf(reminderTime: string | null | undefined): number {
  // Traži CIFRE izričito: `Number('')` je 0, ne NaN — pa bi prazno polje značilo
  // ponoć (pritegnuto na 5h) umesto podrazumevanih 8h. Tiha greška za sve koji
  // nisu birali vreme.
  const m = /^\s*(\d{1,2})\s*(?::|$)/.exec(String(reminderTime ?? ''))
  if (!m) return REMINDERS.defaultHour
  const h = Number(m[1])
  if (!Number.isInteger(h) || h > 23) return REMINDERS.defaultHour
  return Math.min(REMINDERS.maxHour, Math.max(REMINDERS.minHour, h))
}

export function reminderDue(
  tz: string,
  lastReminderKey: string | null | undefined,
  now: Date = new Date(),
  reminderTime?: string | null,
): ReminderCheck {
  // Zonu normalizujemo JEDNOM ovde: pokvarena vrednost iz baze ne sme da baci i
  // obori ceo prolaz podsetnika (todayKey bi na nevažećoj zoni pukao).
  const zone = toTimezone(tz)
  // Datum MORA da se računa iz istog trenutka kao i sat (`now`) — todayKey uvek
  // gleda stvarni časovnik, pa su se sat i datum razilazili čim se `now` prosledi
  // (zone ispred UTC-a dobijale sutrašnji ključ). U produkciji `now` je sadašnjost,
  // pa se ponašanje ne menja; ovim funkcija postaje stvarno čista i testabilna.
  const today = dayKey(now, zone)
  const hour = hourInTimezone(zone, now)
  // Prozor kreće od SATA KOJI JE KORISNIK IZABRAO, pa još `toleranceHours` —
  // tolerancija je tu samo da zakašnjenje budilnika nikoga ne preskoči, nije
  // "otprilike kad stigne".
  const from = reminderHourOf(reminderTime)
  const inWindow = hour >= from && hour <= from + REMINDERS.toleranceHours
  return { today, hour, due: inWindow && lastReminderKey !== today }
}
