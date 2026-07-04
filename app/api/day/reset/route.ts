import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate } from '@/lib/validation'

const schema = z.object({ dateKey: zStrictDate })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { dateKey } = parsed.data

  const { data: entry } = await supabase
    .from('day_entries').select('id').eq('user_id', user.id).eq('date_key', dateKey).maybeSingle()

  if (entry) {
    await supabase.from('tasks').delete().eq('user_id', user.id).eq('entry_id', entry.id)
    await supabase.from('day_entries').delete().eq('user_id', user.id).eq('id', entry.id)
  }

  await Promise.all([
    supabase.from('appointments').delete().eq('user_id', user.id).eq('date_key', dateKey),
    supabase.from('transferred_tasks').delete().eq('user_id', user.id).eq('for_date', dateKey),
    supabase.from('scheduled_tasks').update({ done: false }).eq('user_id', user.id).eq('for_date', dateKey),
  ])

  return apiOk({ ok: true })
}
