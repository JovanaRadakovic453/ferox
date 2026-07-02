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

// ---- Ulazne sheme (telo zahteva) ----
export const zTaskInput = z.object({
  name: z.string().trim().min(1).max(120),
  note: z.string().max(500).optional().default(''),
  priority: zPriority,
  type: zTaskType,
  done: z.boolean().optional().default(false),
  position: z.number().int().optional(),
  block_index: z.number().int().min(0).max(3).nullable().optional(),
  zone_id: z.string().uuid().nullable().optional(),
})

export const zAppointmentInput = z.object({
  name: z.string().trim().min(1).max(120),
  time: zTime,
  reminder: z.number().int().min(0).max(1440).optional().default(DEFAULTS.reminderMinutes),
  done: z.boolean().optional().default(false),
  zone_id: z.string().uuid().nullable().optional(),
})

export const createDaySchema = z.object({
  dateKey: zStrictDate,
  sleepHours: z.number().nullable().optional(),
  sleepTime: zTime.optional(),
  wakeTime: zTime.optional(),
  tasks: z.array(zTaskInput).max(50),
  appointments: z.array(zAppointmentInput).max(50).optional().default([]),
  // Zakazani zadaci koji su UŠLI u ovaj plan — samo oni se markiraju kao done.
  scheduledTaskIds: z.array(z.string().uuid()).max(50).optional().default([]),
})

export const replanSchema = z.object({
  situation: z.string().trim().min(1).max(1000),
  remainingTasks: z.array(z.string().max(120)).max(50),
})

export const brainDumpSchema = z.object({
  text: z.string().trim().min(1).max(2000),
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

export type CreateDayBody = z.infer<typeof createDaySchema>
export type TaskInput = z.infer<typeof zTaskInput>
export type AppointmentInput = z.infer<typeof zAppointmentInput>
