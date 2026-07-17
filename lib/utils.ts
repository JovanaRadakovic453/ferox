import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { todayKey as dayTodayKey } from '@/lib/date'
import type { Locale } from '@/types/ferox'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DATE_NAMES = {
  sr: {
    days: ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'],
    months: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'],
  },
  en: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
} satisfies Record<Locale, { days: string[]; months: string[] }>

// `locale` je opcioni s podrazumevanim 'sr' → postojeći pozivi rade netaknuto.
// sr: "Ponedeljak, 20. jul" · en: "Monday, Jul 20"
export function formatDate(dateKey: string, locale: Locale = 'sr'): string {
  const { days, months } = DATE_NAMES[locale] ?? DATE_NAMES.sr
  const d = new Date(`${dateKey}T12:00:00Z`)
  const day = days[d.getUTCDay()]
  const dd = d.getUTCDate()
  const mon = months[d.getUTCMonth()]
  return locale === 'en' ? `${day}, ${mon} ${dd}` : `${day}, ${dd}. ${mon}`
}

// Reeksport iz lib/date radi kompatibilnosti postojećih import-a.
// `tz` opcion → podrazumevano Beograd (nepromenjeno). Prosleđuje se dalje.
export function todayKey(tz?: string): string {
  return dayTodayKey(tz)
}

export function calcSleepHours(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let diff = (wh * 60 + wm) - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return Math.round((diff / 60) * 10) / 10
}
