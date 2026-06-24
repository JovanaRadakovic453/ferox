import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, apiError, ERR } from '@/lib/api'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

// Permanently delete the account. ON DELETE CASCADE removes profile + all data.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.accountDelete
  if (!(await checkRateLimit(supabase, 'account-delete', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const admin = createAdminClient()
  if (!admin) {
    return apiError('NOT_CONFIGURED', 'Brisanje naloga trenutno nije dostupno (nedostaje konfiguracija).', 503)
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('account-delete', error)
    return ERR.server()
  }

  await supabase.auth.signOut().catch(() => {})
  return apiOk({ ok: true })
}
