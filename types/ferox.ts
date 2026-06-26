// Jedan izvor istine za enum-e: const niz + izveden union tip. Mora se i dalje
// poklapati sa schema.sql CHECK ograničenjima. lib/validation.ts uvozi ove
// nizove (z.enum) umesto da ih duplira.
export const TASK_TYPES = [
  'creative', 'analytical', 'meetings', 'communication', 'admin', 'light',
  'rest', 'learning', 'exercise', 'planning', 'reading', 'meditation',
] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]
export type Reason = 'work' | 'school' | 'personal' | 'all'
export type Rhythm = 'morning' | 'midday' | 'evening' | 'mixed'

export interface Task {
  id?: string
  name: string
  done: boolean
  priority: Priority
  type: TaskType
  note: string
  position?: number
  /** Manual block placement (0..3) set via drag-reorder; null/undefined = engine auto-places. */
  block_index?: number | null
}

export interface Appointment {
  id?: string
  name: string
  time: string
  reminder: number
  done: boolean
  date_key?: string
}

export interface PlanBlock {
  label: string
  badge: string
  badgeText: string
  timeRange: string
  tasks: Task[]
  /** True for the user's peak-energy block (chronotype). */
  peak?: boolean
  /** Short Serbian "why these tasks are here" line, derived from the energy fit. */
  rationale?: string
}

export type Theme = 'light' | 'dark' | 'system'

export interface UserProfile {
  id?: string
  name: string
  reason: Reason
  rhythm: Rhythm
  morning_tasks: string[]
  evening_tasks: string[]
  sleep_time: string
  start_time: string
  rest_days: number[]
  completed_once: boolean
  last_sleep_time?: string
  last_sleep_hours?: number
  best_streak?: number
  theme?: Theme
  micro_feedback?: boolean
  sound_enabled?: boolean
  pomodoro_minutes?: number
}

export interface DayEntry {
  id?: string
  user_id?: string
  date_key: string
  /** Emoji label for display, e.g. "🔥 Pun gas". Mirrors energy_level. */
  energy: string
  /** Numeric energy, canonical 1=best … 5=survival. Source of truth for the engine & analytics. */
  energy_level?: number | null
  sleep_hours: number | null
  water_intake: number
  water_goal: number
  reflection?: string | null
  eod_recap?: string | null
  finished_at?: string | null
  tasks?: Task[]
  appointments?: Appointment[]
}

export type EnergyLevel = 1 | 2 | 3 | 4 | 5

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: '🔥 Pun gas',
  2: '😊 Dobro',
  3: '😐 Prosečno',
  4: '🥱 Umorno',
  5: '🪫 Preživljavam',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  creative: '🎨 Kreativno',
  analytical: '🧠 Analitičko',
  meetings: '👥 Sastanci',
  communication: '💬 Komunikacija',
  admin: '📋 Administrativno',
  light: '🌿 Lagano',
  rest: '😴 Odmor',
  learning: '📚 Učenje',
  exercise: '💪 Vežbanje',
  planning: '🗓️ Planiranje',
  reading: '📖 Čitanje',
  meditation: '🧘 Meditacija',
}

export type RoutineTask = { name: string; type: TaskType; priority: Priority; block_index?: number | null }
export type Routine = { id: string; user_id: string; name: string; tasks: RoutineTask[]; created_at: string }

export const BLOCK_LABELS: Record<number, string> = {
  0: '🌅 Jutro',
  1: '🕙 Prepodne',
  2: '☀️ Popodne',
  3: '🌙 Veče',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '🔴 Visok',
  medium: '🟡 Srednji',
  low: '🟢 Nizak',
}
