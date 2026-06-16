import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message, context } = await request.json()

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Ti si Ferox asistent — energy coach za produktivnost. Pomažeš korisniku da bolje upravlja energijom i zadacima. Odgovaraj na srpskom, kratko i direktno. Kontekst dana korisnika: ${JSON.stringify(context)}`,
    messages: [{ role: 'user', content: message }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
