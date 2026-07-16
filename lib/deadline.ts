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
