import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const { id } = await params
  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return ERR.server(error.message)
  return apiOk({ ok: true })
}
