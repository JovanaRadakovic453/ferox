import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { todayKey as dayTodayKey } from '@/lib/date'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateKey: string): string {
  const days = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota']
  const months = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'avg', 'sep', 'okt', 'nov', 'dec',
  ]
  const d = new Date(`${dateKey}T12:00:00Z`)
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()}. ${months[d.getUTCMonth()]}`
}

// Reeksport iz lib/date radi kompatibilnosti postojećih import-a.
// Sada koristi lokalnu zonu (Europe/Belgrade), ne UTC.
export function todayKey(): string {
  return dayTodayKey()
}

export function calcSleepHours(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let diff = (wh * 60 + wm) - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return Math.round((diff / 60) * 10) / 10
}
