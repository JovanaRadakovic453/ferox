import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PRIVREMENI endpoint za testiranje — obriši posle upotrebe
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nisi ulogovana' }, { status: 401 })

  const dates = ['2026-06-26', '2026-06-27']

  const { data: entries } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .in('date_key', dates)

  const entryIds = (entries ?? []).map(e => e.id)

  if (entryIds.length > 0) {
    await supabase.from('tasks').delete().eq('user_id', user.id).in('entry_id', entryIds)
    await supabase.from('day_entries').delete().eq('user_id', user.id).in('id', entryIds)
  }

  await supabase.from('appointments').delete().eq('user_id', user.id).in('date_key', dates)
  await supabase.from('transferred_tasks').delete().eq('user_id', user.id).in('for_date', dates)

  return NextResponse.json({ ok: true, poruka: 'Obrisano! Možeš zatvoriti ovu stranicu.' })
}
