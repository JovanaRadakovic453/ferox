import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, ERR } from '@/lib/api'
import { todayKey } from '@/lib/date'
import { deadlineReminderBody } from '@/lib/deadline'
import type { NextRequest } from 'next/server'

export const maxDuration = 60

// Jutarnji podsetnik: Vercel cron (vercel.json, jednom dnevno ujutru) šalje
// push SVIM korisnicima sa aktivnom pretplatom, osim onima koji su već
// napravili današnji plan. Fiksno vreme za sve — hobby plan nema češći cron.
export async function GET(request: NextRequest) {
  // Vercel cron šalje `Authorization: Bearer <CRON_SECRET>`; x-cron-secret
  // ostaje za ručno testiranje (curl).
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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_subscription')
    .not('push_subscription', 'is', null)

  if (!profiles?.length) return apiOk({ sent: 0, skippedPlanned: 0, cleaned: 0 })

  const today = todayKey()
  const ids = profiles.map(p => p.id)

  // Ko je već napravio današnji plan (njega ne zovemo da planira), i kome danas
  // ističe / je probijen rok (njega zovemo UVEK — rok je važniji od plana).
  const [{ data: planned }, { data: dueTaskRows }, { data: dueSchedRows }] = await Promise.all([
    supabase.from('day_entries').select('user_id').eq('date_key', today).in('user_id', ids),
    supabase.from('tasks').select('user_id, name, deadline_date')
      .in('user_id', ids).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', today),
    supabase.from('scheduled_tasks').select('user_id, name, deadline_date')
      .in('user_id', ids).eq('done', false).not('deadline_date', 'is', null).lte('deadline_date', today),
  ])
  const plannedSet = new Set((planned ?? []).map(r => r.user_id as string))

  type DueRow = { user_id: string; name: string; deadline_date: string }
  const dueByUser = new Map<string, { name: string; deadline_date: string }[]>()
  for (const r of [...((dueTaskRows ?? []) as DueRow[]), ...((dueSchedRows ?? []) as DueRow[])]) {
    const list = dueByUser.get(r.user_id) ?? []
    list.push({ name: r.name, deadline_date: r.deadline_date })
    dueByUser.set(r.user_id, list)
  }

  const recipients = profiles.filter(p => dueByUser.has(p.id) || !plannedSet.has(p.id))
  const skippedPlanned = profiles.length - recipients.length

  const morningBody = 'Dobro jutro! Vreme je da napraviš plan za danas.'

  let sent = 0
  let deadlineSent = 0
  const stale: string[] = []

  await Promise.allSettled(
    recipients.map(async (p) => {
      const due = dueByUser.get(p.id)
      const body = (due && deadlineReminderBody(due, today)) || morningBody
      const payload = JSON.stringify({ title: 'Ferox', body })
      try {
        await webpush.sendNotification(p.push_subscription as webpush.PushSubscription, payload)
        sent++
        if (due) deadlineSent++
      } catch (err: unknown) {
        // 404/410 = pretplata mrtva → očisti; ostale greške su tranzijentne.
        if (err instanceof webpush.WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          stale.push(p.id)
        }
      }
    })
  )

  if (stale.length) {
    await supabase
      .from('profiles')
      .update({ push_subscription: null })
      .in('id', stale)
  }

  return apiOk({ sent, deadlineSent, skippedPlanned, cleaned: stale.length })
}
