import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiOk, ERR } from '@/lib/api'
import { zStrictDate } from '@/lib/validation'
import { extractText } from '@/lib/ai/parse'
import { FEROX_PERSONA } from '@/lib/ai/prompts'
import { energyLabel } from '@/lib/energy'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { TaskType } from '@/types/ferox'

const bodySchema = z.object({ dateKey: zStrictDate })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)

  const { data: entry } = await supabase.from('day_entries')
    .select('id, energy_level, eod_recap')
    .eq('user_id', user.id).eq('date_key', parsed.data.dateKey).maybeSingle()
  if (!entry) return ERR.invalidInput('Dan nije pronađen')

  // Cached — don't pay for the model twice for the same finished day.
  if (entry.eod_recap) return apiOk({ recap: entry.eod_recap })

  const { data: tasks } = await supabase.from('tasks')
    .select('type, done').eq('entry_id', entry.id)
  const list = tasks ?? []
  const done = list.filter(t => t.done)
  const total = list.length
  const doneTypes = [...new Set(done.map(t => TASK_TYPE_LABELS[t.type as TaskType] ?? t.type))].join(', ')
  const energyTxt = entry.energy_level ? energyLabel(entry.energy_level) : 'nepoznata'

  let recap = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: [{ type: 'text', text: FEROX_PERSONA, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content:
          `Korisnik je upravo završio dan. Uradio/la je ${done.length} od ${total} zadataka. ` +
          `Energija danas: ${energyTxt}. ${doneTypes ? `Završeni tipovi: ${doneTypes}. ` : ''}` +
          `Napiši toplu poruku od 1-2 rečenice na srpskom koja priznaje trud (čak i ako je malo urađeno). Bez osuđivanja, bez klišea. Vrati SAMO poruku.`,
      }],
    })
    recap = extractText(message) ?? ''
  } catch {
    // Deterministic fallback — app never hard-depends on the model.
    recap = done.length === 0
      ? 'Dan je gotov. Sutra je novi početak — to je sasvim u redu.'
      : `Završio/la si ${done.length} ${done.length === 1 ? 'stvar' : 'stvari'} danas. To se računa. 🌙`
  }

  if (recap) {
    await supabase.from('day_entries').update({ eod_recap: recap }).eq('id', entry.id)
  }
  return apiOk({ recap })
}
