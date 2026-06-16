import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { situation, remainingTasks, energy } = await request.json()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Korisnik ima energiju: ${energy}. Dan se raspao. Situacija: "${situation}".

Preostali zadaci: ${JSON.stringify(remainingTasks)}

Pomozi da replaniram dan. Vrati JSON sa:
- danas: string[] (zadaci koje da uradim danas)
- sutra: string[] (zadaci za sutra)
- obrisi: string[] (zadaci koje da otpišem)
- poruka: string (kratka motivišuća poruka na srpskom, max 2 rečenice)

Vrati SAMO JSON, bez ikakvog drugog teksta.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI greška' }, { status: 500 })
  }

  try {
    const cleaned = content.text.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Nisam mogao da parsovam odgovor' }, { status: 500 })
  }
}
