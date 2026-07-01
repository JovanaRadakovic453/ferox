import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, ERR } from '@/lib/api'
import type { NextRequest } from 'next/server'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return ERR.unauthorized()

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return ERR.aiUnavailable('VAPID nije konfigurisan')

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createAdminClient()
  if (!supabase) return ERR.server('Admin klijent nije konfigurisan')

  // Current hour in Belgrade time (Europe/Belgrade = UTC+1 or UTC+2)
  const now = new Date()
  const belgradeHour = new Intl.DateTimeFormat('sr-RS', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  // belgradeHour is like "07:00"
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_subscription, reminder_time')
    .eq('reminder_time', belgradeHour)
    .not('push_subscription', 'is', null)

  if (!profiles?.length) return apiOk({ sent: 0 })

  const payload = JSON.stringify({
    title: 'Ferox',
    body: 'Dobro jutro! Vreme je da napraviš plan za danas.',
  })

  let sent = 0
  const stale: string[] = []

  await Promise.allSettled(
    profiles.map(async (p) => {
      try {
        await webpush.sendNotification(p.push_subscription as webpush.PushSubscription, payload)
        sent++
      } catch (err: unknown) {
        if (err instanceof webpush.WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          stale.push(p.id)
        }
      }
    })
  )

  // Clean up expired subscriptions
  if (stale.length) {
    await supabase
      .from('profiles')
      .update({ push_subscription: null, reminder_time: null })
      .in('id', stale)
  }

  return apiOk({ sent, cleaned: stale.length })
}
