import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { ERR } from '@/lib/api'
import { chatSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = chatSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { message, context } = parsed.data

  // Bound the context so a huge day can't blow up the prompt.
  const ctxStr = JSON.stringify(context ?? {}).slice(0, 4000)

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Ti si Ferox asistent — energy coach za produktivnost. Pomažeš korisniku da bolje upravlja energijom i zadacima. Odgovaraj na srpskom, kratko, toplo i direktno. Nikad ne kritikuješ — fokus je na tome šta je realno danas. Kontekst dana korisnika: ${ctxStr}`,
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
