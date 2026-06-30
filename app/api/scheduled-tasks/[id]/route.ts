import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zPriority } from '@/lib/validation'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  priority: zPriority.optional(),
  note: z.string().max(500).optional(),
  remind_before_minutes: z.number().int().min(1).max(142560).nullable().optional(),
  deadline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const { id } = await params
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data, error } = await supabase
    .from('scheduled_tasks')
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

  const { id } = await params
  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return ERR.server(error.message)
  return apiOk({ ok: true })
}
