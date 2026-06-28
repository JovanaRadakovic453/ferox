import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { z } from 'zod'
import { zStrictDate, zPriority } from '@/lib/validation'

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priority: zPriority.default('medium'),
  note: z.string().max(500).default(''),
  for_date: zStrictDate,
  remind_before: z.enum(['day_before', 'morning']).nullable().default(null),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return ERR.invalidInput('Parametri from i to su obavezni')

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('for_date', from)
    .lte('for_date', to)
    .eq('done', false)
    .order('for_date')

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
    .from('scheduled_tasks')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return ERR.server(error.message)
  return apiOk(data, 201)
}
