import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('day_entries')
    .select('id, date_key, energy, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const entryIds = (entries ?? []).map(e => e.id)

  const { data: tasks } = entryIds.length
    ? await supabase.from('tasks').select('id, name, done, entry_id, created_at').in('entry_id', entryIds)
    : { data: [] }

  const { data: cookies_note } = { data: 'check browser manually' }

  return NextResponse.json({
    serverToday: today,
    userId: user.id,
    entries: entries ?? [],
    tasks: tasks ?? [],
  })
}
