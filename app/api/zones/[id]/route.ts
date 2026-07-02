import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().max(4).optional(),
  position: z.number().int().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.zonesWrite
  if (!(await checkRateLimit(supabase, 'zones-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { id } = await params
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data, error } = await supabase
    .from('zones')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return ERR.server(error.message)
  return apiOk(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.zonesWrite
  if (!(await checkRateLimit(supabase, 'zones-write', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const { id } = await params
  const { error } = await supabase
    .from('zones')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return ERR.server(error.message)
  return apiOk({ ok: true })
}
