import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateKey: string): string {
  const days = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota']
  const months = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'avg', 'sep', 'okt', 'nov', 'dec',
  ]
  const d = new Date(dateKey)
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`
}

export function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function calcSleepHours(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let diff = (wh * 60 + wm) - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return Math.round((diff / 60) * 10) / 10
}
