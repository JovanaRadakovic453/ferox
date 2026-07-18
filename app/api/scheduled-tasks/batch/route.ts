import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { scheduledBatchSchema } from '@/lib/validation'
import { todayKey, toTimezone } from '@/lib/date'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

// Batch upis budućeg dela plana iz brain dump-a: zakazani zadaci u
// scheduled_tasks, a stavke sa satnicom kao pravi termini (appointments,
// sa podsetnikom). Jedan zahtev umesto N.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.scheduledWrite
  if (!(await checkRateLimit(supabase, 'scheduled-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  // "Danas" po zoni korisnika — provera "nije u prošlosti" mora njegov dan.
  const { data: prof } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle()
  const today = todayKey(toTimezone(prof?.timezone))

  const json = await request.json().catch(() => null)
  const parsed = scheduledBatchSchema(today).safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { tasks, appointments } = parsed.data

  if (tasks.length > 0) {
    const rows = tasks.map(t => ({ user_id: user.id, ...t }))
    const { error } = await supabase.from('scheduled_tasks').insert(rows)
    if (error) return ERR.server(error.message)
  }

  if (appointments.length > 0) {
    const rows = appointments.map(a => ({ user_id: user.id, ...a }))
    const { error } = await supabase.from('appointments').insert(rows)
    if (error) return ERR.server(error.message)
  }

  return apiOk({ tasks: tasks.length, appointments: appointments.length }, 201)
}
