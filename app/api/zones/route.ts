import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().trim().min(1).max(50),
  icon: z.string().max(4).default('📁'),
  position: z.number().int().min(0).default(0),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  if (error) return ERR.server(error.message)
  return apiOk(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data, error } = await supabase
    .from('zones')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return ERR.server(error.message)
  return apiOk(data, 201)
}
