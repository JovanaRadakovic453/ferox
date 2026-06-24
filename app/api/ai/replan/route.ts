import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { replanSchema, replanResultSchema } from '@/lib/validation'
import { extractText } from '@/lib/ai/parse'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = replanSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { situation, remainingTasks, energy } = parsed.data

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Korisnik ima energiju: ${energy}. Dan se raspao. Situacija: "${situation}".

Preostali zadaci: ${JSON.stringify(remainingTasks)}

Pomozi da replaniram dan. Vrati JSON sa:
- danas: string[] (zadaci koje da uradim danas)
- sutra: string[] (zadaci za sutra)
- obrisi: string[] (zadaci koje da otpišem)
- poruka: string (kratka motivišuća poruka na srpskom, max 2 rečenice)

Koristi TAČNO imena zadataka iz liste. Vrati SAMO JSON, bez ikakvog drugog teksta.`,
      }],
    })
  } catch (err) {
    return ERR.aiUnavailable(err instanceof Error ? err.message : String(err))
  }

  const text = extractText(message)
  if (!text) return ERR.aiUnavailable('Prazan AI odgovor')
  try {
    const result = replanResultSchema.parse(JSON.parse(text))
    return apiOk(result)
  } catch {
    return ERR.aiUnavailable('Nisam mogao da pročitam AI odgovor')
  }
}
