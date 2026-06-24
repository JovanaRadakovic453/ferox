import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { brainDumpSchema, aiBrainDumpResult, TASK_TYPES, PRIORITIES } from '@/lib/validation'
import { TASK_TYPE_GUIDE } from '@/lib/ai/prompts'
import { AI, RATE_LIMITS } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'

// Forced tool-use: the SDK guarantees valid JSON and enums can't be wrong.
// Concrete times become appointments; everything else is a task.
const extractTool = {
  name: 'extract_plan',
  description: 'Izdvoji zadatke i zakazane termine iz korisnikovog teksta na srpskom.',
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
            priority: { type: 'string', enum: [...PRIORITIES] },
            note: { type: 'string' },
            estMinutes: { type: 'number', description: 'realna procena trajanja u minutima (sa ADHD bufferom)' },
          },
          required: ['name', 'type', 'priority'],
        },
      },
      appointments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            time: { type: 'string', description: 'HH:MM, 24h' },
          },
          required: ['name', 'time'],
        },
      },
    },
    required: ['tasks', 'appointments'],
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const rl = RATE_LIMITS.brainDump
  if (!(await checkRateLimit(supabase, 'brain-dump', rl.limit, rl.windowSec))) return ERR.rateLimited()

  const json = await request.json().catch(() => null)
  const parsed = brainDumpSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { text } = parsed.data

  let message
  try {
    message = await anthropic.messages.create({
      model: AI.model,
      max_tokens: AI.maxTokens.brainDump,
      tools: [extractTool],
      tool_choice: { type: 'tool', name: 'extract_plan' },
      system: [{ type: 'text', text: TASK_TYPE_GUIDE, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content:
          `Izdvoji najviše ${AI.brainDumpMaxTasks} zadataka i sve zakazane termine iz teksta. ` +
          `Ako tekst pominje konkretno vreme (npr. "u 14h", "sastanak u 9", "zubar u 11:30"), to je TERMIN sa time u HH:MM; inače je zadatak. ` +
          `Tekst: "${text}"`,
      }],
    })
  } catch (err) {
    console.error('brain-dump', err)
    return ERR.aiUnavailable()
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
