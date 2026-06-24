import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { ERR } from '@/lib/api'
import { chatSchema } from '@/lib/validation'
import { FEROX_PERSONA } from '@/lib/ai/prompts'
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.chat
  if (!(await checkRateLimit(supabase, 'chat', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = chatSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { message, context } = parsed.data

  // Bound the context so a huge day can't blow up the prompt.
  const ctxStr = JSON.stringify(context ?? {}).slice(0, AI.chatContextChars)

  const stream = await anthropic.messages.stream({
    model: AI.model,
    max_tokens: AI.maxTokens.chat,
    // Fixed persona is prompt-cached; only the per-day context varies.
    system: [
      { type: 'text', text: FEROX_PERSONA, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Kontekst dana korisnika (JSON): ${ctxStr}` },
    ],
    messages: [{ role: 'user', content: message }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n(Veza sa AI je prekinuta. Pokušaj ponovo.)'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
