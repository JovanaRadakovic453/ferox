// "Kalendar doslednosti" (GitHub-style heatmap): po danu koliko je od plana
// završeno. Pure/testabilno — bez baze i DOM-a. Kolone = nedelje, redovi = dani
// (Pon..Ned). Poslednja kolona je tekuća nedelja.

import { addDays } from '@/lib/date'

export type ConsistencyCell = {
  date_key: string
  done: number
  total: number
  /** % realizacije (0-100); null = tog dana nije bilo plana. */
  rate: number | null
  /** Datum je u budućnosti (prazan kvadratić na kraju mreže). */
  future: boolean
}

/** Indeks dana u nedelji sa ponedeljkom kao 0 (Pon=0 … Ned=6). */
function mondayIndex(dateKey: string): number {
  return (new Date(`${dateKey}T12:00:00Z`).getUTCDay() + 6) % 7
}

/**
 * Mreža doslednosti: `weeks` nedelja unazad, svaka kolona 7 dana (Pon..Ned).
 * Poslednja kolona je nedelja u kojoj je `today`.
 */
export function buildConsistencyWeeks(
  data: { date_key: string; done: number; total: number }[],
  today: string,
  weeks = 13,
): ConsistencyCell[][] {
  const byDate = new Map(data.map(d => [d.date_key, d]))
  const thisMonday = addDays(today, -mondayIndex(today))
  const startMonday = addDays(thisMonday, -(weeks - 1) * 7)

  const cols: ConsistencyCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: ConsistencyCell[] = []
    for (let d = 0; d < 7; d++) {
      const key = addDays(startMonday, w * 7 + d)
      const rec = byDate.get(key)
      const done = rec?.done ?? 0
      const total = rec?.total ?? 0
      col.push({
        date_key: key,
        done,
        total,
        rate: total > 0 ? Math.round((done / total) * 100) : null,
        future: key > today,
      })
    }
    cols.push(col)
  }
  return cols
}

/**
 * Nivo boje 0..4 (0 = prazno / nema plana / ništa urađeno, 4 = sve završeno).
 * Boje se mapiraju u komponenti — ovde je samo (testabilna) logika praga.
 */
export function cellLevel(cell: ConsistencyCell): 0 | 1 | 2 | 3 | 4 {
  if (cell.future || cell.rate === null || cell.rate === 0) return 0
  if (cell.rate <= 33) return 1
  if (cell.rate <= 66) return 2
  if (cell.rate < 100) return 3
  return 4
}
