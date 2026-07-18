import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { todayKey, toTimezone } from '@/lib/date'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Zaustavlja seriju koja se ponavlja.
 *
 * Briše SAMO buduća, nezavršena pojavljivanja — prošlost i ono što je korisnik
 * već odradio ostaje u istoriji. "Danas" se računa po zoni korisnika, da mu se
 * današnji, još neodrađen zadatak ne obriše ispod ruke uveče.
 *
 * Pravilo se briše na kraju; `scheduled_tasks.repeat_id` je `on delete set null`,
 * pa preostala (odrađena) pojavljivanja prežive kao obični zadaci.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.scheduledWrite
  if (!(await checkRateLimit(supabase, 'scheduled-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { id } = await params

  // Vlasništvo se proverava eksplicitno (ne oslanjamo se samo na RLS) da bi tuđi
  // id vratio 404, a ne tiho "uspešno" brisanje nula redova.
  const { data: rule } = await supabase
    .from('task_repeats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rule) return ERR.notFound()

  const { data: prof } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle()
  const today = todayKey(toTimezone(prof?.timezone))

  const { error: delErr, count } = await supabase
    .from('scheduled_tasks')
    .delete({ count: 'exact' })
    .eq('repeat_id', id)
    .eq('user_id', user.id)
    .eq('done', false)
    .gte('for_date', today)

  if (delErr) return ERR.server(delErr.message)

  const { error: ruleErr } = await supabase
    .from('task_repeats')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (ruleErr) return ERR.server(ruleErr.message)

  return apiOk({ removed: count ?? 0 })
}
