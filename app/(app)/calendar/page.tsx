import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { todayKey, addDays } from '@/lib/date'
import CalendarView from '@/components/calendar/CalendarView'

function monthBounds(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayKey()
  const params = await searchParams
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month)
    ? params.month
    : today.slice(0, 7)

  // Load ±14 days around the month so adjacent weeks render without gaps
  const { from, to } = monthBounds(month)
  const expandedFrom = addDays(from, -14)
  const expandedTo = addDays(to, 14)

  const [
    { data: entries },
    { data: appointments },
    { data: scheduled },
  ] = await Promise.all([
    supabase
      .from('day_entries')
      .select('id, date_key, finished_at')
      .eq('user_id', user.id)
      .gte('date_key', expandedFrom)
      .lte('date_key', expandedTo)
      .order('date_key'),
    supabase
      .from('appointments')
      .select('id, date_key, name, time, done')
      .eq('user_id', user.id)
      .gte('date_key', expandedFrom)
      .lte('date_key', expandedTo)
      .order('date_key'),
    supabase
      .from('scheduled_tasks')
      .select('id, for_date, name, priority, note, remind_before_minutes, deadline_date')
      .eq('user_id', user.id)
      .gte('for_date', expandedFrom)
      .lte('for_date', expandedTo)
      .eq('done', false)
      .order('for_date'),
  ])

  // Count tasks per date (via day_entry → tasks)
  const entryRows = entries ?? []
  const entryIds = entryRows.map(e => e.id)
  let taskCountByDate: Record<string, number> = {}

  if (entryIds.length > 0) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('entry_id')
      .in('entry_id', entryIds)

    const countById: Record<string, number> = {}
    for (const t of taskRows ?? []) {
      countById[t.entry_id] = (countById[t.entry_id] ?? 0) + 1
    }
    for (const e of entryRows) {
      if (countById[e.id]) taskCountByDate[e.date_key] = countById[e.id]
    }
  }

  return (
    <CalendarView
      initialMonth={month}
      today={today}
      entries={entryRows as { id: string; date_key: string; finished_at: string | null }[]}
      taskCountByDate={taskCountByDate}
      appointments={(appointments ?? []) as { id: string; date_key: string; name: string; time: string; done: boolean }[]}
      scheduled={(scheduled ?? []) as { id: string; for_date: string; name: string; priority: string; note: string; remind_before_minutes: number | null; deadline_date: string | null }[]}
    />
  )
}
