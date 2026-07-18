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

import { hourInTimezone, todayKey, toTimezone } from '@/lib/date'
import { REMINDERS } from '@/lib/config'

export type ReminderCheck = {
  /** Lokalni datum korisnika (YYYY-MM-DD) — pod njim se pamti da je poslato. */
  today: string
  /** Lokalni sat korisnika (0-23). */
  hour: number
  /** Da li sada treba poslati. */
  due: boolean
}

export function reminderDue(
  tz: string,
  lastReminderKey: string | null | undefined,
  now: Date = new Date(),
): ReminderCheck {
  // Zonu normalizujemo JEDNOM ovde: pokvarena vrednost iz baze ne sme da baci i
  // obori ceo prolaz podsetnika (todayKey bi na nevažećoj zoni pukao).
  const zone = toTimezone(tz)
  const today = todayKey(zone)
  const hour = hourInTimezone(zone, now)
  const inMorning = hour >= REMINDERS.morningHour && hour <= REMINDERS.latestHour
  return { today, hour, due: inMorning && lastReminderKey !== today }
}
