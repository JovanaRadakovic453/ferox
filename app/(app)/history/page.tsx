import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryView, { type HistoryDay } from '@/components/history/HistoryView'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('day_entries')
    .select('id, date_key, energy, sleep_hours, finished_at')
    .eq('user_id', user.id)
    .order('date_key', { ascending: false })
    .limit(30)

  const list = entries ?? []
  const ids = list.map(e => e.id)

  // Single query for all tasks of those days, then aggregate in memory.
  const counts = new Map<string, { done: number; total: number }>()
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('tasks').select('entry_id, done').in('entry_id', ids)
    for (const t of tasks ?? []) {
      const c = counts.get(t.entry_id) ?? { done: 0, total: 0 }
      c.total += 1
      if (t.done) c.done += 1
      counts.set(t.entry_id, c)
    }
  }

  const days: HistoryDay[] = list.map(e => {
    const c = counts.get(e.id) ?? { done: 0, total: 0 }
    return { ...e, done: c.done, total: c.total, pct: c.total ? Math.round((c.done / c.total) * 100) : 0 }
  })

  return <HistoryView days={days} />
}
