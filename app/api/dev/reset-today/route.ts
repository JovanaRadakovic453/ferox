import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { todayKey } from '@/lib/date'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nisi ulogovan' }, { status: 401 })

  const { data: entry } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('date_key', todayKey())
    .single()

  if (!entry) return NextResponse.json({ ok: true, message: 'Nema unosa za danas' })

  await supabase.from('tasks').delete().eq('entry_id', entry.id)
  await supabase.from('appointments').delete().eq('user_id', user.id).eq('date_key', todayKey())
  await supabase.from('day_entries').update({ finished_at: null }).eq('id', entry.id)

  return NextResponse.json({ ok: true, message: 'Resetovano ✓' })
}
