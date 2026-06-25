import { AI } from '@/lib/config'

// DeepSeek je OpenAI-kompatibilan, pa ga zovemo običnim fetch-om (bez novog
// npm paketa → bez npm install / cert problema). Ključ je SAMO server-side.
//
// Uključuje se tek kad korisnik postavi env varijable:
//   DEEPSEEK_API_KEY=...        (tajna, u Vercel env)
//   AI_PROVIDER=deepseek        (prekidač; bez njega ostaje Anthropic)

/** Da li je DeepSeek ključ konfigurisan. */
export function deepseekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY
}

/** True kad Coach chat treba da koristi DeepSeek umesto Anthropic-a. */
export function useDeepSeekChat(): boolean {
  return process.env.AI_PROVIDER === 'deepseek' && deepseekConfigured()
}

/**
 * Streaming chat preko DeepSeek-a (OpenAI /chat/completions, SSE). Vraća
 * text/plain stream odgovora — isti oblik koji Coach UI već čita.
 */
export async function deepseekChatStream(
  system: string,
  message: string,
  maxTokens: number,
): Promise<Response> {
  const res = await fetch(`${AI.deepseek.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI.deepseek.model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`DeepSeek HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        outer: while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx: number
          // SSE: linije oblika `data: {json}`, kraj je `data: [DONE]`.
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const data = line.slice(5).trim()
            if (data === '[DONE]') break outer
            try {
              const text = JSON.parse(data)?.choices?.[0]?.delta?.content
              if (text) controller.enqueue(encoder.encode(text))
            } catch {
              // delimičan/nevažeći JSON komad — preskoči
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n(Veza sa AI je prekinuta. Pokušaj ponovo.)'))
      } finally {
        controller.close()
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
