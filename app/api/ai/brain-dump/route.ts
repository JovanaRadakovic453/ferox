import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst je obavezan' }, { status: 400 })
  }

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Izvuci zadatke iz sledećeg teksta i vrati ih kao JSON niz. Svaki zadatak treba da ima: name (string), priority (high/medium/low), type (creative/analytical/meetings/communication/admin/light/rest/learning/exercise/planning/reading/meditation), note (string, može biti prazan).

Maksimalno 8 zadataka. Vrati SAMO JSON niz, bez ikakvog drugog teksta.

Tekst: "${text}"`,
        },
      ],
    })
  } catch (err) {
    console.error('[brain-dump] Anthropic error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI nije dostupan: ${msg}` }, { status: 502 })
  }

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI greška' }, { status: 500 })
  }

  console.log('[brain-dump] raw response:', content.text)

  try {
    const cleaned = content.text.replace(/```json\n?|\n?```/g, '').trim()
    const tasks = JSON.parse(cleaned)
    console.log('[brain-dump] parsed tasks:', tasks)
    return NextResponse.json({ tasks })
  } catch {
    console.error('[brain-dump] parse failed, raw:', content.text)
    return NextResponse.json({ error: 'Nisam mogao da parsovam zadatke' }, { status: 500 })
  }
}
