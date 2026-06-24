export type TaskType =
  | 'creative'
  | 'analytical'
  | 'meetings'
  | 'communication'
  | 'admin'
  | 'light'
  | 'rest'
  | 'learning'
  | 'exercise'
  | 'planning'
  | 'reading'
  | 'meditation'

export type Priority = 'high' | 'medium' | 'low'
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
}

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
}

export interface DayEntry {
  id?: string
  user_id?: string
  date_key: string
  energy: string
  sleep_hours: number | null
  water_intake: number
  water_goal: number
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

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '🔴 Visok',
  medium: '🟡 Srednji',
  low: '🟢 Nizak',
}
