import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { replanSchema, replanResultSchema } from '@/lib/validation'
import { FEROX_PERSONA } from '@/lib/ai/prompts'
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

// Forced tool-use (kao brain-dump): SDK garantuje validan JSON, bez parsiranja
// slobodnog teksta. Svako ime ide u tačno jednu od tri kante.
const replanTool = {
  name: 'replan_day',
  description: 'Replaniraj ostatak dana: rasporedi preostale zadatke u danas / sutra / otpiši.',
  input_schema: {
    type: 'object' as const,
    properties: {
      danas: { type: 'array', items: { type: 'string' }, description: 'zadaci koje korisnik i dalje stiže danas' },
      sutra: { type: 'array', items: { type: 'string' }, description: 'zadaci koje treba prebaciti za sutra' },
      obrisi: { type: 'array', items: { type: 'string' }, description: 'zadaci koje treba otpisati (nisu više bitni)' },
      poruka: { type: 'string', description: 'kratka topla poruka na srpskom, max 2 rečenice, bez osuđivanja' },
    },
    required: ['danas', 'sutra', 'obrisi', 'poruka'],
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.replan
  if (!(await checkRateLimit(supabase, 'replan', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = replanSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { situation, remainingTasks } = parsed.data
  if (remainingTasks.length === 0) return ERR.invalidInput('Nema preostalih zadataka za replan')

  if (!process.env.ANTHROPIC_API_KEY) return ERR.aiUnavailable()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await anthropic.messages.create({
      model: AI.model,
      max_tokens: AI.maxTokens.replan,
      tools: [replanTool],
      tool_choice: { type: 'tool', name: 'replan_day' },
      system: [{ type: 'text', text: FEROX_PERSONA, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content:
          `Dan se korisniku raspao. Situacija: "${situation}".\n\n` +
          `Preostali (nezavršeni) zadaci: ${JSON.stringify(remainingTasks)}\n\n` +
          `Rasporedi ih realno: šta se danas još stiže, šta ide za sutra, šta da se otpiše. ` +
          `Koristi TAČNO imena iz liste — svako ime u tačno jednu kantu.`,
      }],
    })
  } catch (err) {
    console.error('replan', err instanceof Error ? err.message : err)
    return ERR.aiUnavailable()
  }

  const block = message.content.find(c => c.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return ERR.aiUnavailable('AI nije vratio strukturu')

  const result = replanResultSchema.safeParse(block.input)
  if (!result.success) return ERR.aiUnavailable('Neispravna struktura odgovora')

  // Defanzivni post-filter: samo stvarna imena, bez duplikata među kantama
  // (prioritet: obrisi > sutra > danas). AI-jev tipfeler = no-op, nikad pogrešno brisanje.
  const valid = new Set(remainingTasks)
  const seen = new Set<string>()
  const pick = (names: string[]) => {
    const out: string[] = []
    for (const n of names) {
      if (valid.has(n) && !seen.has(n)) { seen.add(n); out.push(n) }
    }
    return out
  }
  const obrisi = pick(result.data.obrisi)
  const sutra = pick(result.data.sutra)
  const danas = pick(result.data.danas)
  // Sve što AI nije pomenuo ostaje za danas — pregled uvek pokriva ceo spisak.
  for (const n of remainingTasks) if (!seen.has(n)) danas.push(n)

  return apiOk({ danas, sutra, obrisi, poruka: result.data.poruka })
}
