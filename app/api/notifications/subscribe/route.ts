import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { RATE_LIMITS, REMINDERS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  // Sat kad korisnik hoce podsetnik. Pun sat jer budilnik radi na pun sat — minuti
  // se ne bi mogli ispostovati, pa se ni ne obecavaju.
  hour: z.number().int().min(REMINDERS.minHour).max(REMINDERS.maxHour).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.notifications
  if (!(await checkRateLimit(supabase, 'notifications', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { subscription, hour } = parsed.data

  const { error } = await supabase
    .from('profiles')
    .update({
      push_subscription: subscription,
      // Prazno = ostavi ranije izabrano (ili podrazumevano).
      ...(hour !== undefined ? { reminder_time: `${String(hour).padStart(2, '0')}:00` } : {}),
    })
    .eq('id', user.id)

  if (error) return ERR.server(error.message)
  return apiOk({})
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  await supabase
    .from('profiles')
    .update({ push_subscription: null })
    .eq('id', user.id)

  return apiOk({})
}
