import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, ERR } from '@/lib/api'
import { todayKey } from '@/lib/date'
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

  // Ko je već napravio današnji plan — njega ne podsećamo.
  const today = todayKey()
  const ids = profiles.map(p => p.id)
  const { data: planned } = await supabase
    .from('day_entries')
    .select('user_id')
    .eq('date_key', today)
    .in('user_id', ids)
  const plannedSet = new Set((planned ?? []).map(r => r.user_id as string))

  const recipients = profiles.filter(p => !plannedSet.has(p.id))
  const skippedPlanned = profiles.length - recipients.length

  const payload = JSON.stringify({
    title: 'Ferox',
    body: 'Dobro jutro! Vreme je da napraviš plan za danas.',
  })

  let sent = 0
  const stale: string[] = []

  await Promise.allSettled(
    recipients.map(async (p) => {
      try {
        await webpush.sendNotification(p.push_subscription as webpush.PushSubscription, payload)
        sent++
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

  return apiOk({ sent, skippedPlanned, cleaned: stale.length })
}
