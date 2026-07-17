import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiOk, ERR } from '@/lib/api'
import { zStrictDate } from '@/lib/validation'
import { extractText } from '@/lib/ai/parse'
import { feroxPersona, outputLangRule, langLocative } from '@/lib/ai/prompts'
import { getUserLocale } from '@/lib/locale'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { TaskType, Locale } from '@/types/ferox'

// Rezerva kad AI nije dostupan — app nikad ne sme da zavisi od modela.
const FALLBACK: Record<Locale, { none: string; some: (n: number) => string; finished: string }> = {
  sr: {
    none: 'Dan je gotov. Sutra je novi početak — to je sasvim u redu.',
    some: n => `Završio/la si ${n} ${n === 1 ? 'stvar' : 'stvari'} danas. To se računa. 🌙`,
    finished: 'Dan je završen. Svaki korak napred se računa. 🌙',
  },
  en: {
    none: 'The day is done. Tomorrow is a fresh start — and that is perfectly fine.',
    some: n => `You finished ${n} ${n === 1 ? 'thing' : 'things'} today. That counts. 🌙`,
    finished: 'Day complete. Every step forward counts. 🌙',
  },
}
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

const bodySchema = z.object({ dateKey: zStrictDate })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.eod
  if (!(await checkRateLimit(supabase, 'eod', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data: entry } = await supabase.from('day_entries')
    .select('id, eod_recap')
    .eq('user_id', user.id).eq('date_key', parsed.data.dateKey).maybeSingle()
  if (!entry) return ERR.invalidInput('Dan nije pronađen')

  // Cached — don't pay for the model twice for the same finished day.
  if (entry.eod_recap) return apiOk({ recap: entry.eod_recap })

  const locale = await getUserLocale(supabase, user.id)
  const fb = FALLBACK[locale]

  if (!process.env.ANTHROPIC_API_KEY) {
    return apiOk({ recap: fb.finished })
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: tasks } = await supabase.from('tasks')
    .select('type, done').eq('entry_id', entry.id)
  const list = tasks ?? []
  const done = list.filter(t => t.done)
  const total = list.length
  const doneTypes = [...new Set(done.map(t => TASK_TYPE_LABELS[t.type as TaskType] ?? t.type))].join(', ')

  let recap = ''
  try {
    const message = await anthropic.messages.create({
      model: AI.model,
      max_tokens: AI.maxTokens.eod,
      system: [{ type: 'text', text: `${feroxPersona(locale)}\n\n${outputLangRule(locale)}`, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content:
          `Korisnik je upravo završio dan. Uradio/la je ${done.length} od ${total} zadataka. ` +
          `${doneTypes ? `Završeni tipovi: ${doneTypes}. ` : ''}` +
          `Napiši toplu poruku od 1-2 rečenice na ${langLocative(locale)} koja priznaje trud (čak i ako je malo urađeno). Bez osuđivanja, bez klišea. Vrati SAMO poruku.`,
      }],
    })
    recap = extractText(message) ?? ''
  } catch {
    // Deterministic fallback — app never hard-depends on the model.
    recap = done.length === 0 ? fb.none : fb.some(done.length)
  }

  if (recap) {
    await supabase.from('day_entries').update({ eod_recap: recap }).eq('id', entry.id)
  }
  return apiOk({ recap })
}
