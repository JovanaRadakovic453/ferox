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
  /** Rok: do kada mora biti gotovo (YYYY-MM-DD). Prati zadatak i kad uđe u dan. */
  deadline_date?: string | null
}

export interface Appointment {
  id?: string
  name: string
  time: string
  reminder: number
  done: boolean
  date_key?: string
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
  push_subscription?: object | null
  google_refresh_token?: string | null
}

export interface DayEntry {
  id?: string
  user_id?: string
  date_key: string
  /** legacy kolona — aplikacija je više ne piše ni ne čita (istorijski podaci ostaju u bazi) */
  energy?: string
  /** legacy kolona — ne koristi se */
  energy_level?: number | null
  sleep_hours: number | null
  /** legacy kolone — water tracker je uklonjen iz UI-ja */
  water_intake?: number
  water_goal?: number
  /** legacy kolona — refleksija je uklonjena iz EOD toka */
  reflection?: string | null
  eod_recap?: string | null
  finished_at?: string | null
  tasks?: Task[]
  appointments?: Appointment[]
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

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '🔴 Visok',
  medium: '🟡 Srednji',
  low: '🟢 Nizak',
}
