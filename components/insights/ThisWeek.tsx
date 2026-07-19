'use client'

// "Ova nedelja" — grafikon koji se PUNI kroz nedelju (pon..ned), u Uvidima.
//
// Zašto ovako, a ne kao poseban ekran na kraju nedelje: najčešća zamerka planerima
// je da "svako jutro počinje od nule i ništa se ne nagomilava". Stubić koji raste
// svakog dana je odgovor na to — radi celu nedelju, a ne samo u nedelju uveče.
// Zato nema nijednog dugmeta: ništa se ne potvrđuje, samo se vidi.
//
// Slobodni dani se NE prikazuju kao promašaj — prazna subota je pauza, ne rupa.

import type { ConsistencyCell } from '@/lib/consistency'
import { useT } from '@/components/i18n/I18nProvider'

const BAR_MAX = 52
const BAR_MIN = 4

export default function ThisWeek({
  week, today, restDays = [],
}: {
  /** Tačno 7 ćelija, pon..ned (poslednja kolona buildConsistencyWeeks). */
  week: ConsistencyCell[]
  today: string
  /** Dani koji ne lome niz (0 = nedelja … 6 = subota), iz profila. */
  restDays?: number[]
}) {
  const t = useT()
  const totalDone = week.reduce((s, c) => s + c.done, 0)
  const peak = Math.max(1, ...week.map(c => c.done))

  // Pon..Ned → broj dana u nedelji kakav stoji u profilu (0 = nedelja).
  const weekdayNum = (i: number) => (i + 1) % 7

  return (
    <div className="card p-5 lg:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="section-label">{t.insights.thisWeek}</p>
        <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {t.insights.thisWeekDone(totalDone)}
        </p>
      </div>

      <div className="flex items-end gap-2" style={{ height: BAR_MAX + 22 }}>
        {week.map((cell, i) => {
          const isToday = cell.date_key === today
          const isRest = restDays.includes(weekdayNum(i))
          const height = cell.done > 0 ? BAR_MIN + (cell.done / peak) * (BAR_MAX - BAR_MIN) : BAR_MIN

          return (
            <div key={cell.date_key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-full flex items-end justify-center" style={{ height: BAR_MAX }}>
                <div
                  className="w-full rounded-[3px] transition-all"
                  style={{
                    height,
                    background: cell.future
                      ? 'var(--surface2)'
                      : cell.done > 0
                        ? 'var(--gold)'
                        : 'var(--hairline)',
                    outline: isToday ? '1.5px solid var(--gold)' : 'none',
                    outlineOffset: '2px',
                  }}
                  title={`${cell.done}/${cell.total}`}
                />
              </div>
              <span
                className="text-[0.62rem] truncate w-full text-center"
                style={{
                  color: isToday ? 'var(--gold)' : 'var(--text-muted)',
                  fontWeight: isToday ? 600 : 400,
                  opacity: isRest && !isToday ? 0.55 : 1,
                }}
              >
                {t.insights.weekdaysShort[i]}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {totalDone === 0 ? t.insights.thisWeekEmpty : t.insights.thisWeekHint}
      </p>
    </div>
  )
}
