import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, ERR } from '@/lib/api'
import { toTimezone } from '@/lib/date'
import { reminderDue, pushText } from '@/lib/reminders'
import { topUpRepeats } from '@/lib/repeatTopUp'
import { toLocale } from '@/lib/locale'
import { deadlineReminderBody } from '@/lib/deadline'
import type { NextRequest } from 'next/server'

export const maxDuration = 60

// Jutarnji podsetnik — stiže u JUTRO KORISNIKA, ne po vremenu servera.
//
// Budilnik (.github/workflows/reminders.yml) lupa ovu rutu SVAKI SAT. Ruta za
// svakog korisnika gleda koliko je sati KOD NJEGA (profiles.timezone) i šalje samo
// onima koji su u jutarnjem prozoru i koji taj (svoj) dan još nisu dobili podsetnik
// — profiles.last_reminder_key. Odluka je izdvojena u lib/reminders.ts.
//
// Vercelov cron (vercel.json) ostaje kao rezerva: Hobby plan ga pušta samo jednom
// dnevno pa sam ne pokriva sve zone, ali last_reminder_key garantuje da ne napravi
// duplikat ako se poklopi sa budilnikom.
//
// Podsetnik ne dobija ko je već napravio svoj današnji plan — osim ako mu danas
// ističe ili je probijen rok (rok je važniji od plana).
export async function GET(request: NextRequest) {
  // Vercel cron šalje `Authorization: Bearer <CRON_SECRET>`; x-cron-secret koristi
  // GitHub budilnik i ručno testiranje (curl).
  const bearer = request.headers.get('authorization')
  const manual = request.headers.get('x-cron-secret')
  const secret = process.env.CRON_SECRET
  const authorized = !!secret && (bearer === `Bearer ${secret}` || manual === secret)
  if (!authorized) return ERR.unauthorized()

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return ERR.server('VAPID nije konfigurisan')

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createAdminClient()
  if (!supabase) return ERR.server('Admin klijent nije konfigurisan')

  // Dopuna zadataka koji se ponavljaju — vozi se na istom satnom budilniku, da
  // serija ne bi tiho presušila kad se istroši horizont (vidi lib/repeatTopUp.ts).
  // Namerno u try/catch: greška u dopuni ne sme da spreči jutarnje podsetnike.
  let repeats = { rules: 0, created: 0 }
  try {
    repeats = await topUpRepeats(supabase)
  } catch (err) {
    console.error('repeat top-up error:', err instanceof Error ? err.message : String(err))
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_subscription, timezone, last_reminder_key, locale')
    .not('push_subscription', 'is', null)

  const nothing = { sent: 0, deadlineSent: 0, skippedPlanned: 0, cleaned: 0, candidates: 0, repeats }
  if (!profiles?.length) return apiOk(nothing)

  // Ko je SAD u svom jutru i taj dan još nije dobio podsetnik.
  const now = new Date()
  const candidates = profiles
    .map(p => {
      const { today, due } = reminderDue(
        toTimezone(p.timezone),
        p.last_reminder_key as string | null,
        now,
      )
      return { id: p.id as string, sub: p.push_subscription, today, due, locale: toLocale(p.locale) }
    })
    .filter(c => c.due)

  if (!candidates.length) return apiOk(nothing)

  const ids = candidates.map(c => c.id)
  // "Danas" se razlikuje po korisniku (različite zone), pa svaki red iz baze
  // proveravamo prema BAŠ NJEGOVOM danu — ne prema jednom globalnom datumu.
  const todayById = new Map(candidates.map(c => [c.id, c.today]))
  const dates = [...new Set(candidates.map(c => c.today))]
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))

  // Ko je već napravio svoj današnji plan, i kome ističe / je probijen rok.
  //
  // Rok se gleda SAMO na onome što je danas "živo": zadaci u DANAŠNJEM planu,
  // preneseni za danas i otvoreni zakazani. Istorijske kopije (nedovršen zadatak
  // ostaje done=false u starom danu kad se prenese) NE ulaze — inače bi završen
  // zadatak slao lažni "probijen rok" svako jutro doveka.
  const [{ data: planned }, { data: dueSchedRows }, { data: transferredRows }] = await Promise.all([
    supabase.from('day_entries').select('id, user_id, date_key').in('date_key', dates).in('user_id', ids),
    supabase.from('scheduled_tasks').select('user_id, name, deadline_date')
      .in('user_id', ids).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', maxDate),
    supabase.from('transferred_tasks').select('user_id, tasks, for_date').in('for_date', dates).in('user_id', ids),
  ])

  const plannedRows = (planned ?? []).filter(r => todayById.get(r.user_id as string) === r.date_key)
  const plannedSet = new Set(plannedRows.map(r => r.user_id as string))

  const todayEntryIds = plannedRows.map(r => r.id as string)
  const { data: dueTaskRows } = todayEntryIds.length
    ? await supabase.from('tasks').select('user_id, name, deadline_date')
        .in('entry_id', todayEntryIds).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', maxDate)
    : { data: [] }

  type DueRow = { user_id: string; name: string; deadline_date: string }
  type TransferItem = { name?: string; done?: boolean; deadline_date?: string | null }
  const dueTransferred: DueRow[] = (transferredRows ?? [])
    .filter(r => todayById.get(r.user_id as string) === r.for_date)
    .flatMap(r =>
      ((r.tasks ?? []) as TransferItem[])
        .filter(t => t.name && !t.done && t.deadline_date)
        .map(t => ({ user_id: r.user_id as string, name: t.name as string, deadline_date: t.deadline_date as string }))
    )

  // Dedup po (korisnik, naziv, rok) — isti zadatak iz dva izvora se broji jednom.
  // `maxDate` u upitima gore je samo grub filter (jedan SQL za sve zone); pravu
  // granicu "<= njegov danas" presuđujemo ovde, po korisniku.
  const dueByUser = new Map<string, { name: string; deadline_date: string }[]>()
  const seen = new Set<string>()
  for (const r of [...((dueTaskRows ?? []) as DueRow[]), ...dueTransferred, ...((dueSchedRows ?? []) as DueRow[])]) {
    const userToday = todayById.get(r.user_id)
    if (!userToday || r.deadline_date > userToday) continue
    const key = `${r.user_id}|${r.name}|${r.deadline_date}`
    if (seen.has(key)) continue
    seen.add(key)
    const list = dueByUser.get(r.user_id) ?? []
    list.push({ name: r.name, deadline_date: r.deadline_date })
    dueByUser.set(r.user_id, list)
  }

  const recipients = candidates.filter(c => dueByUser.has(c.id) || !plannedSet.has(c.id))
  const skippedPlanned = candidates.length - recipients.length

  let sent = 0
  let deadlineSent = 0
  const stale: string[] = []
  // Datum pamtimo tek kad je push STVARNO otišao — da neuspeh (mreža, push servis)
  // ostane da se ponovi u sledećem satu, dok je korisnik još u jutarnjem prozoru.
  const sentByDate = new Map<string, string[]>()

  await Promise.allSettled(
    recipients.map(async (c) => {
      const due = dueByUser.get(c.id)
      // Poruka na jeziku korisnika (profiles.locale) — i rok i jutarnji pozdrav.
      const body = (due && deadlineReminderBody(due, c.today, c.locale)) || pushText(c.locale).morning
      const payload = JSON.stringify({ title: 'Ferox', body })
      try {
        await webpush.sendNotification(c.sub as webpush.PushSubscription, payload)
        sent++
        if (due) deadlineSent++
        const list = sentByDate.get(c.today) ?? []
        list.push(c.id)
        sentByDate.set(c.today, list)
      } catch (err: unknown) {
        // 404/410 = pretplata mrtva → očisti; ostale greške su tranzijentne.
        if (err instanceof webpush.WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          stale.push(c.id)
        }
      }
    })
  )

  await Promise.all(
    [...sentByDate].map(([date, uids]) =>
      supabase.from('profiles').update({ last_reminder_key: date }).in('id', uids)
    )
  )

  if (stale.length) {
    await supabase
      .from('profiles')
      .update({ push_subscription: null })
      .in('id', stale)
  }

  return apiOk({ sent, deadlineSent, skippedPlanned, cleaned: stale.length, candidates: candidates.length, repeats })
}
