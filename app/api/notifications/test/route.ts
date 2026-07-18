import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import { pushText } from '@/lib/reminders'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.notifications
  if (!(await checkRateLimit(supabase, 'notifications', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscription, locale')
    .eq('id', user.id)
    .single()

  if (!profile?.push_subscription) return ERR.invalidInput('Nema aktivne pretplate')

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return ERR.server('VAPID nije konfigurisan')

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  try {
    await webpush.sendNotification(
      profile.push_subscription as webpush.PushSubscription,
      JSON.stringify({ title: 'Ferox', body: pushText(profile.locale).test })
    )
    return apiOk({})
  } catch {
    return ERR.server('Slanje nije uspelo')
  }
}
