'use client'

import { cellLevel, trimLeadingEmptyWeeks, type ConsistencyCell } from '@/lib/consistency'
import { useT, useLocale } from '@/components/i18n/I18nProvider'

// Nivo (0..4) → boja kvadratića. 0 = prazno (nema plana / ništa), 4 = sve završeno.
const LEVEL_BG = [
  'var(--surface2)',
  'color-mix(in srgb, var(--gold) 28%, var(--surface2))',
  'color-mix(in srgb, var(--gold) 52%, var(--surface2))',
  'color-mix(in srgb, var(--gold) 76%, var(--surface2))',
  'var(--gold)',
] as const

const CELL = 15 // px

export default function ConsistencyHeatmap({ weeks }: { weeks: ConsistencyCell[][] }) {
  const t = useT()
  const locale = useLocale()
  const fmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'sr-Latn-RS', { day: 'numeric', month: 'short' })

  // Mreža prati koliko podataka ima (bez mora praznih nedelja s početka).
  const shown = trimLeadingEmptyWeeks(weeks)
  // "Danas" = najnoviji dan koji nije u budućnosti — da se jasno vidi gde je sad.
  const today = shown.flat().reduce((m, c) => (!c.future && c.date_key > m ? c.date_key : m), '')

  // Redovi su Pon..Ned (0..6); rečnik `weekdays` je [Ned..Sub] pa je (r+1)%7.
  const rowLabel = (r: number) => t.insights.weekdays[(r + 1) % 7]

  function tooltip(cell: ConsistencyCell): string | undefined {
    if (cell.future) return undefined
    const d = fmt.format(new Date(`${cell.date_key}T12:00:00Z`))
    return cell.rate === null ? `${d} — ${t.insights.noPlanDay}` : `${d} — ${t.insights.dayDone(cell.done, cell.total)}`
  }

  return (
    <div className="card p-5 lg:p-6 flex flex-col gap-4">
      <div>
        <p className="section-label">{t.insights.consistencyTitle}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.insights.consistencyHint}</p>
      </div>

      {/* Mreža — horizontalni skrol da nikad ne razbije layout */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px] w-max">
          {/* Kolona sa nazivima dana (Pon/Sre/Pet) */}
          <div className="flex flex-col gap-[3px] pr-1 shrink-0">
            {Array.from({ length: 7 }, (_, r) => (
              <div
                key={r}
                className="text-[0.55rem] leading-none flex items-center justify-end"
                style={{ height: CELL, color: 'var(--text-muted)' }}
              >
                {r % 2 === 0 ? rowLabel(r) : ''}
              </div>
            ))}
          </div>

          {shown.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px] shrink-0">
              {col.map((cell, r) => {
                const isToday = !cell.future && cell.date_key === today
                return (
                  <div
                    key={r}
                    title={tooltip(cell)}
                    aria-hidden={cell.future}
                    className="rounded-[3px]"
                    style={{
                      width: CELL,
                      height: CELL,
                      background: cell.future ? 'transparent' : LEVEL_BG[cellLevel(cell)],
                      border: cell.future
                        ? 'none'
                        : isToday
                          ? '1.5px solid var(--gold-deep)'
                          : '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda: Manje □□□□□ Više */}
      <div className="flex items-center gap-1.5 self-end">
        <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.insights.less}</span>
        {LEVEL_BG.map((bg, i) => (
          <span
            key={i}
            className="rounded-[3px]"
            style={{ width: 11, height: 11, background: bg, border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}
          />
        ))}
        <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t.insights.more}</span>
      </div>
    </div>
  )
}
