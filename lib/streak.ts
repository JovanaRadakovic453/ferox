import { addDays } from '@/lib/date'

/**
 * Shame-free momentum: consecutive finished days counting back from today,
 * SKIPPING rest days (a planned day off never breaks the streak). Today not
 * being finished yet does not break it either — we just keep counting backward.
 */
export function computeStreak(finished: ReadonlySet<string>, restDays: number[], today: string): number {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i)
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay()
    if (restDays.includes(wd)) continue // day off — skip, don't count, don't break
    if (finished.has(d)) { streak++; continue }
    if (i === 0) continue // today still in progress
    break
  }
  return streak
}
