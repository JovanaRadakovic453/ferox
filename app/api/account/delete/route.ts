import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, apiError, ERR } from '@/lib/api'

// Permanently delete the account. ON DELETE CASCADE removes profile + all data.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const admin = createAdminClient()
  if (!admin) {
    return apiError('NOT_CONFIGURED', 'Brisanje naloga trenutno nije dostupno (nedostaje konfiguracija).', 503)
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return ERR.server(error.message)

  await supabase.auth.signOut().catch(() => {})
  return apiOk({ ok: true })
}
