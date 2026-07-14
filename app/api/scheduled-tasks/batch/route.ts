import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { scheduledBatchSchema } from '@/lib/validation'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

// Batch upis zakazanih zadataka — koristi ga potvrđeni nedeljni plan iz brain
// dump-a (svi budući dani odjednom, jedan zahtev umesto N).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.scheduledWrite
  if (!(await checkRateLimit(supabase, 'scheduled-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = scheduledBatchSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const rows = parsed.data.tasks.map(t => ({ user_id: user.id, ...t }))
  const { data, error } = await supabase.from('scheduled_tasks').insert(rows).select()
  if (error) return ERR.server(error.message)

  return apiOk(data ?? [], 201)
}
