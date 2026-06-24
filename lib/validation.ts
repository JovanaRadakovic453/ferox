import { z } from 'zod'
import { isValidDayKey } from '@/lib/date'
import { DEFAULTS } from '@/lib/config'
import { TASK_TYPES, PRIORITIES } from '@/types/ferox'

// Enum-i žive u types/ferox.ts (jedan izvor istine, izveden union tip); ovde ih
// samo uvozimo za z.enum i re-eksportujemo radi postojećih import-a iz ovog modula.
export { TASK_TYPES, PRIORITIES }

export const zPriority = z.enum(PRIORITIES)
export const zTaskType = z.enum(TASK_TYPES)
export const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Vreme mora biti HH:MM')
export const zStrictDate = z.string().refine(isValidDayKey, 'Neispravan datum')
export const zEnergyLevel = z.number().int().min(1).max(5)

// ---- Ulazne sheme (telo zahteva) ----
export const zTaskInput = z.object({
  name: z.string().trim().min(1).max(120),
  note: z.string().max(500).optional().default(''),
  priority: zPriority,
  type: zTaskType,
  done: z.boolean().optional().default(false),
  position: z.number().int().optional(),
  block_index: z.number().int().min(0).max(3).nullable().optional(),
})

export const zAppointmentInput = z.object({
  name: z.string().trim().min(1).max(120),
  time: zTime,
  reminder: z.number().int().min(0).max(1440).optional().default(DEFAULTS.reminderMinutes),
  done: z.boolean().optional().default(false),
})

export const createDaySchema = z.object({
  dateKey: zStrictDate,
  energy: z.string().min(1),
  energyLevel: zEnergyLevel,
  sleepHours: z.number().nullable().optional(),
  sleepTime: zTime.optional(),
  wakeTime: zTime.optional(),
  tasks: z.array(zTaskInput).max(50),
  appointments: z.array(zAppointmentInput).max(50).optional().default([]),
})

export const replanSchema = z.object({
  situation: z.string().trim().min(1).max(1000),
  remainingTasks: z.array(z.string().max(120)).max(50),
  energy: z.string().min(1),
})

export const brainDumpSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  context: z.unknown().optional(),
})

export const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
    block_index: z.number().int().min(0).max(3).nullable(),
  })).max(100),
})

// ---- Izlazne sheme (AI parsiranje / tool-use) — tolerantne, sa fallback-om ----
export const aiTaskSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: zTaskType.catch('light'),
  priority: zPriority.catch('medium'),
  note: z.string().max(500).catch(''),
  estMinutes: z.number().int().min(0).max(600).optional(),
})
export const aiAppointmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  time: zTime,
})
export const aiBrainDumpResult = z.object({
  tasks: z.array(aiTaskSchema).max(12).default([]),
  appointments: z.array(aiAppointmentSchema).max(12).default([]),
})
export const replanResultSchema = z.object({
  danas: z.array(z.string()).default([]),
  sutra: z.array(z.string()).default([]),
  obrisi: z.array(z.string()).default([]),
  poruka: z.string().default(''),
})

// Insights ulaz: agregati su PRE-izračunati na klijentu (vidi lib/insights.ts
// Aggregates). Validacija ograničava veličinu (odbrana + cap na token-trošak).
const zBar = z.object({
  label: z.string().max(40),
  rate: z.number(),
  n: z.number().int().min(0),
})
export const insightsInputSchema = z.object({
  aggregates: z.object({
    dayCount: z.number().int().min(0),
    overallCompletion: z.number(),
    byEnergy: z.array(zBar).max(10),
    byWeekday: z.array(zBar).max(10),
    byType: z.array(zBar).max(20),
    sleepInsight: z.string().max(300).nullable(),
  }),
})

// Insights izlaz (tool-use) — re-validira se zod-om kao i brain-dump.
export const aiInsightSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(400),
  type: z.enum(['pattern', 'tip', 'win']).optional(),
})
export const aiInsightsResult = z.object({
  insights: z.array(aiInsightSchema).default([]),
})

export type CreateDayBody = z.infer<typeof createDaySchema>
export type TaskInput = z.infer<typeof zTaskInput>
export type AppointmentInput = z.infer<typeof zAppointmentInput>
