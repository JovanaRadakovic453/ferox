import { createClient } from '@/lib/supabase/server'
import { apiOk, ERR } from '@/lib/api'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  await supabase.from('profiles').update({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expires_at: null,
  }).eq('id', user.id)

  return apiOk({})
}
