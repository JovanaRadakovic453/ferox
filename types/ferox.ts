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

/** Jezik korisnika. Bira se pri onboardingu; čuva se u profiles.locale. */
export const LOCALES = ['sr', 'en'] as const
export type Locale = (typeof LOCALES)[number]
/** Naziv jezika na tom istom jeziku — razumljiv i kad UI još nije preveden. */
export const LOCALE_LABELS: Record<Locale, string> = { sr: 'Srpski', en: 'English' }
export const LOCALE_FLAGS: Record<Locale, string> = { sr: '🇷🇸', en: '🇬🇧' }
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
  /** Ako je zadatak uvučen iz Google Kalendara (celodnevni događaj) — id tog događaja. */
  google_event_id?: string | null
  /**
   * Klijentska oznaka (NIJE kolona u bazi): zadatak potiče iz zakazanog
   * (scheduled_tasks.id). Šalje se pri snimanju plana i tamo se upisuje u
   * `scheduled_id` kolonu.
   */
  scheduledId?: string
  /**
   * KOLONA u bazi (migracija 0022) — veza ka `scheduled_tasks.id` iz kog je zadatak
   * došao. Po njoj štikliranje u planu zatvara original u Kalendaru, pa se zadatak
   * koji "stoji dok se ne završi" prestane pojavljivati.
   */
  scheduled_id?: string | null
}

export interface Appointment {
  id?: string
  name: string
  /** Početak (HH:MM). */
  time: string
  /** Kraj (HH:MM) — popunjen npr. kad dođe iz Google Kalendara. null = nepoznat. */
  end_time?: string | null
  /** Ako je termin uvučen iz Google Kalendara — id tog događaja (sprečava duplo uvlačenje). */
  google_event_id?: string | null
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
  /** Jezik korisnika; stari profili nemaju kolonu popunjenu → tretiraj kao 'sr'. */
  locale?: Locale
  /** IANA vremenska zona (npr. 'Europe/Belgrade'); po njoj se računa "danas". */
  timezone?: string
  theme?: Theme
  micro_feedback?: boolean
  sound_enabled?: boolean
  pomodoro_minutes?: number
  /** 'HH:MM' — sat kad korisnik hoće jutarnji podsetnik. Prazno = podrazumevani. */
  reminder_time?: string | null
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
  /** Google događaji koje je korisnik sklonio (✕) sa ovog dana — da se ne uvuku ponovo. */
  google_dismissed?: string[] | null
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
