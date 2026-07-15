import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { brainDumpSchema, aiBrainDumpResult, TASK_TYPES, PRIORITIES } from '@/lib/validation'
import { TASK_TYPE_GUIDE, PLAN_METHOD_GUIDE } from '@/lib/ai/prompts'
import { buildBrainDumpContext } from '@/lib/ai/userContext'
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

// Forced tool-use: the SDK guarantees valid JSON and enums can't be wrong.
// Concrete times become appointments; everything else is a task. AI raspoređuje
// svaku stavku po danu (dayOffset).
const extractTool = {
  name: 'extract_plan',
  description: 'Izdvoji zadatke i termine iz teksta na srpskom i rasporedi ih po danima (Eisenhower + 1-3-5 + rokovi).',
  input_schema: {
    type: 'object' as const,
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'kratko ime na srpskom' },
            type: { type: 'string', enum: [...TASK_TYPES] },
            priority: { type: 'string', enum: [...PRIORITIES], description: 'high samo uz jasnu hitnost/rok; inače medium; low ako može da čeka. Ne stavljaj sve na high.' },
            note: { type: 'string' },
            estMinutes: { type: 'number', description: 'realna procena trajanja u minutima' },
            dayOffset: { type: 'number', description: 'na koji dan ide: 0 = danas, 1 = sutra … najviše 6' },
            reason: { type: 'string', description: 'jedna kratka rečenica na srpskom: zašto baš taj dan' },
          },
          required: ['name', 'type', 'priority', 'dayOffset'],
        },
      },
      appointments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            time: { type: 'string', description: 'HH:MM, 24h' },
            dayOffset: { type: 'number', description: '0 = danas, 1 = sutra … najviše 6' },
          },
          required: ['name', 'time', 'dayOffset'],
        },
      },
    },
    required: ['tasks', 'appointments'],
  },
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return ERR.aiUnavailable('API ključ nije podešen')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.brainDump
  if (!(await checkRateLimit(supabase, 'brain-dump', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = brainDumpSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { text } = parsed.data

  // Kontekst: koliko je već zakazano po danima (da AI ne pretrpa dan).
  const { contextText } = await buildBrainDumpContext(supabase, user.id)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await anthropic.messages.create({
      model: AI.model,
      max_tokens: AI.maxTokens.brainDump,
      tools: [extractTool],
      tool_choice: { type: 'tool', name: 'extract_plan' },
      system: `${TASK_TYPE_GUIDE}\n\n${PLAN_METHOD_GUIDE}`,
      messages: [{
        role: 'user',
        content:
          `Izdvoji najviše ${AI.brainDumpMaxTasks} zadataka i sve termine iz teksta, pa ih rasporedi po danima (dayOffset 0-6, danas je dayOffset 0). ` +
          `Ako korisnik pomene vremenski okvir (npr. "narednih 7 dana", "ove nedelje", "do petka"), OBAVEZNO rasprostri zadatke kroz te dane — NEMOJ sve staviti na danas. ` +
          `Za ponavljajuće zadatke ("2x nedeljno", "svaki dan") napravi više stavki na različite dane. ` +
          `Kad korisnik pomene dan u nedelji (npr. "u četvrtak", "za petak"), pronađi taj dan u listi dana ispod i koristi TAČAN dayOffset za njega — ne pogađaj datum napamet. ` +
          `Predloži prioritet za svaki zadatak (visok/srednji/nizak) po hitnosti, rokovima i po tome kako korisnik obično prioritetizuje slične zadatke (vidi dole) — nemoj sve staviti na srednji. ` +
          `Ako tekst pominje konkretno vreme (npr. "u 14h", "sastanak u 9", "zubar u 11:30"), to je TERMIN sa "time" u HH:MM; inače je zadatak. ` +
          (contextText ? `\n\n${contextText}\n` : '') +
          `\nTekst korisnika: "${text}"`,
      }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('brain-dump error:', msg)
    return ERR.aiUnavailable(msg)
  }

  const block = message.content.find(c => c.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return ERR.aiUnavailable('AI nije vratio strukturu')

  const result = aiBrainDumpResult.safeParse(block.input)
  if (!result.success) return ERR.aiUnavailable('Neispravna struktura odgovora')

  return apiOk({
    tasks: result.data.tasks.slice(0, AI.brainDumpMaxTasks),
    appointments: result.data.appointments.slice(0, AI.brainDumpMaxTasks),
  })
}
