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
  /** Rok — prati zadatak i kad uđe u dan (može biti i u prošlosti: propušten rok). */
  deadline_date: zStrictDate.nullable().optional(),
})

export const zAppointmentInput = z.object({
  name: z.string().trim().min(1).max(120),
  time: zTime,
  reminder: z.number().int().min(0).max(1440).optional().default(DEFAULTS.reminderMinutes),
  done: z.boolean().optional().default(false),
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

export const brainDumpSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

// ---- Izlazne sheme (AI parsiranje / tool-use) — tolerantne, sa fallback-om ----
// dayOffset = na koji dan AI raspoređuje stavku: 0 = danas … 6 = za 6 dana.
// reason = kratko objašnjenje zašto baš taj dan.
const zDayOffset = z.number().int().min(0).max(7).catch(0)
export const aiTaskSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: zTaskType.catch('light'),
  priority: zPriority.catch('medium'),
  note: z.string().max(500).catch(''),
  estMinutes: z.number().int().min(0).max(600).optional(),
  dayOffset: zDayOffset,
  // Rok kao broj dana od danas (0 = danas). Namerno NE tražimo datum od AI-ja —
  // računanje datuma napamet je čest izvor grešaka. null = nema roka.
  deadlineDayOffset: z.number().int().min(0).max(120).nullable().catch(null),
  reason: z.string().max(160).catch(''),
})
export const aiAppointmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  time: zTime,
  dayOffset: zDayOffset,
})
export const aiBrainDumpResult = z.object({
  tasks: z.array(aiTaskSchema).max(30).default([]),
  appointments: z.array(aiAppointmentSchema).max(30).default([]),
})

// Batch upis budućeg dela plana iz brain dump-a: zakazani zadaci + termini
// (stavke sa satnicom postaju pravi termini sa podsetnikom).
// `today` = KORISNIKOV današnji dan (po profiles.timezone). Provera "nije u
// prošlosti" ne sme da računa danas po serverskoj/Beograd zoni — korisniku
// zapadno od Beograda bi uveče odbijala njegov današnji datum.
export const scheduledBatchSchema = (today: string) => z.object({
  tasks: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    priority: zPriority.default('medium'),
    type: zTaskType.default('light'),
    note: z.string().max(500).default(''),
    for_date: zStrictDate.refine(d => d >= today, 'Datum ne može biti u prošlosti'),
    deadline_date: zStrictDate.nullable().default(null),
  })).max(60).default([]),
  appointments: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    time: zTime,
    date_key: zStrictDate.refine(d => d >= today, 'Datum ne može biti u prošlosti'),
    reminder: z.number().int().min(0).max(1440).default(DEFAULTS.reminderMinutes),
  })).max(60).default([]),
}).refine(d => d.tasks.length + d.appointments.length > 0, { message: 'Plan je prazan' })

export type CreateDayBody = z.infer<typeof createDaySchema>
export type TaskInput = z.infer<typeof zTaskInput>
export type AppointmentInput = z.infer<typeof zAppointmentInput>
