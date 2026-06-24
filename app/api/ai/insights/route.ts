import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { FEROX_PERSONA } from '@/lib/ai/prompts'
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { insightsInputSchema, aiInsightsResult } from '@/lib/validation'

// Tool-use over PRE-AGGREGATED stats only (cheap + private — no raw task text leaves).
const insightsTool = {
  name: 'report_insights',
  description: 'Vrati 2-3 kratka, konkretna uvida o korisnikovim obrascima produktivnosti.',
  input_schema: {
    type: 'object' as const,
    properties: {
      insights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'kratak naslov na srpskom' },
            body: { type: 'string', description: '1-2 rečenice, konkretno i bez osuđivanja' },
            type: { type: 'string', enum: ['pattern', 'tip', 'win'] },
          },
          required: ['title', 'body'],
        },
      },
    },
    required: ['insights'],
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.insights
  if (!(await checkRateLimit(supabase, 'insights', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = insightsInputSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { aggregates } = parsed.data

  try {
    const message = await anthropic.messages.create({
      model: AI.model,
      max_tokens: AI.maxTokens.insights,
      tools: [insightsTool],
      tool_choice: { type: 'tool', name: 'report_insights' },
      system: [{ type: 'text', text: FEROX_PERSONA, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content:
          `Ovo su agregirani podaci o produktivnosti korisnika (procenti realizacije po energiji, danu, tipu zadatka, san). ` +
          `Daj 2-3 konkretna, korisna uvida na srpskom. Fokus na obrasce koje korisnik može da iskoristi. Bez osuđivanja.\n\n` +
          JSON.stringify(aggregates),
      }],
    })
    const block = message.content.find(c => c.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return apiOk({ insights: [] })
    // Re-validiraj izlaz modela zod-om (kao brain-dump) umesto sirovog cast-a.
    const out = aiInsightsResult.safeParse(block.input)
    const insights = out.success ? out.data.insights.slice(0, AI.insightsMax) : []
    return apiOk({ insights })
  } catch {
    // Soft-fail: the deterministic charts still render without AI.
    return apiOk({ insights: [] })
  }
}
