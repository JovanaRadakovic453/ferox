// Oznaka roka (rok = do kada mora biti gotovo). Jedno mesto istine da plan i
// kalendar izgledaju isto. Pure — testabilno bez baze/DOM-a.

export type DeadlineBadge = { text: string; color: string; urgent: boolean }

function formatDeadlineDate(dateKey: string, today: string): string {
  const [todayYear] = today.split('-').map(Number)
  const [dlYear] = dateKey.split('-').map(Number)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  if (dlYear !== todayYear) opts.year = 'numeric'
  return new Intl.DateTimeFormat('sr-Latn-RS', opts).format(new Date(`${dateKey}T12:00:00Z`))
}

export type DeadlineTask = { name: string; done: boolean; priority: string; deadline_date?: string | null }

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

/**
 * Redosled po hitnosti roka: 0 = rok prošao, 1 = rok danas, 2 = ostalo.
 * Završeni zadaci nikad nisu hitni (ne skaču na vrh).
 */
export function deadlineRank(t: DeadlineTask, today: string): number {
  if (t.done || !t.deadline_date) return 2
  if (t.deadline_date < today) return 0
  if (t.deadline_date === today) return 1
  return 2
}

/** Zadaci kojima rok ističe danas ili je prošao (a nisu gotovi). */
export function dueTasks<T extends DeadlineTask>(tasks: T[], today: string): T[] {
  return tasks
    .filter(t => deadlineRank(t, today) < 2)
    .sort((a, b) => (a.deadline_date ?? '').localeCompare(b.deadline_date ?? ''))
}

/**
 * Redosled dana: rok koji gori ide na vrh, pa tek onda prioritet.
 * Unutar iste hitnosti — raniji rok prvi, pa prioritet.
 */
export function sortTasksForDay<T extends DeadlineTask>(tasks: T[], today: string): T[] {
  return [...tasks].sort((a, b) => {
    const rank = deadlineRank(a, today) - deadlineRank(b, today)
    if (rank !== 0) return rank
    if (a.deadline_date && b.deadline_date && a.deadline_date !== b.deadline_date) {
      return a.deadline_date < b.deadline_date ? -1 : 1
    }
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  })
}

/**
 * Tekst push podsetnika za rokove. Uzima najhitniji (najraniji) rok i pominje ga
 * imenom — gola brojka ne kaže ništa.
 */
export function deadlineReminderBody(items: { name: string; deadline_date: string }[], today: string): string | null {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
  const first = sorted[0]
  const rest = sorted.length - 1
  const suffix = rest > 0 ? ` (i još ${rest})` : ''
  return first.deadline_date < today
    ? `⚠️ Probijen rok: „${first.name}"${suffix}`
    : `⏳ Danas ističe rok: „${first.name}"${suffix}`
}

/** Koliko dana do roka (negativno = rok je prošao). */
export function daysUntil(dateKey: string, today: string): number {
  const diffMs = new Date(`${dateKey}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Tekst + boja za rok. `urgent` = rok je danas ili prošao (koristi se i za
 * redosled — takav zadatak izbija na vrh).
 */
export function getDeadlineBadge(deadlineDate: string, today: string): DeadlineBadge {
  if (deadlineDate < today) {
    return { text: `Rok prošao: ${formatDeadlineDate(deadlineDate, today)}`, color: 'var(--danger)', urgent: true }
  }
  if (deadlineDate === today) {
    return { text: 'Rok: danas', color: 'var(--warn)', urgent: true }
  }
  const days = daysUntil(deadlineDate, today)
  if (days === 1) return { text: 'Rok: sutra', color: '#f97316', urgent: false }
  if (days <= 7) return { text: `Rok: ${formatDeadlineDate(deadlineDate, today)}`, color: '#f97316', urgent: false }
  return { text: `Rok: ${formatDeadlineDate(deadlineDate, today)}`, color: 'var(--text-muted)', urgent: false }
}
