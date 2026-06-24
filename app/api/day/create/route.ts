import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, apiError, ERR } from '@/lib/api'
import { createDaySchema } from '@/lib/validation'
import { createDay } from '@/lib/day/createDay'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = createDaySchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const result = await createDay(supabase, user.id, parsed.data)
  if (!result.ok) {
    if (result.code === 'COUNT_MISMATCH') return apiError(result.code, result.message, 409, result.detail)
    return ERR.server(result.detail ?? result.message)
  }
  return apiOk({ ok: true, entryId: result.entryId, tasks: result.tasks })
}
