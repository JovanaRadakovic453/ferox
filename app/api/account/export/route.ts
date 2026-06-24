import { createClient } from '@/lib/supabase/server'
import { ERR } from '@/lib/api'

// GDPR data export — all of the user's own rows (RLS-scoped) as a JSON download.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const [profile, days, tasks, appointments, transferred] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('day_entries').select('*').eq('user_id', user.id),
    supabase.from('tasks').select('*').eq('user_id', user.id),
    supabase.from('appointments').select('*').eq('user_id', user.id),
    supabase.from('transferred_tasks').select('*').eq('user_id', user.id),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    day_entries: days.data ?? [],
    tasks: tasks.data ?? [],
    appointments: appointments.data ?? [],
    transferred_tasks: transferred.data ?? [],
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="ferox-podaci.json"',
    },
  })
}
