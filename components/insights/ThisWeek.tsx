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

// Koordinatni sistem krive (SVG se skalira na širinu kartice, do 340px).
const W = 340        // ukupna širina
const PAD = 20       // razmak do prve/poslednje tačke
const BASE = 70      // nulta linija
const TOP = 15       // najviša tačka (peak dana)
const STEP = (W - PAD * 2) / 6

/** Meka kriva kroz tačke — vodoravne kontrolne tačke na pola razmaka. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], mid = (c.x - p.x) / 2
    d += ` C${p.x + mid},${p.y} ${c.x - mid},${c.y} ${c.x},${c.y}`
  }
  return d
}

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

  // Tačke krive: samo dani koji su PROŠLI ili su danas (dani koji tek dolaze
  // nemaju vrednost, pa se ne crtaju).
  const done = week
    .map((cell, i) => ({
      x: PAD + i * STEP,
      y: BASE - (cell.done / peak) * (BASE - TOP),
      future: cell.future,
      isToday: cell.date_key === today,
    }))
    .filter(p => !p.future)
  const todayPt = done.find(p => p.isToday) ?? done[done.length - 1]

  return (
    <div className="card p-5 lg:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="section-label">{t.insights.thisWeek}</p>
        <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {t.insights.thisWeekDone(totalDone)}
        </p>
      </div>

      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} 92`} className="w-full max-w-[340px] h-auto" role="img" aria-label={t.insights.thisWeek}>
          {/* Kriva ide SAMO do današnjeg dana. Da nastavi kroz nedelju, pala bi
              na nulu za dane koji tek dolaze — izgledalo bi kao da je korisnik
              stao, a sreda još nije ni došla. */}
          <path d={`M${PAD},${BASE} L${W - PAD},${BASE}`} stroke="var(--hairline)" strokeWidth={1} fill="none" />

          {done.length > 1 && (
            <path
              d={`${smoothPath(done)} L${done[done.length - 1].x},${BASE} L${done[0].x},${BASE} Z`}
              fill="var(--gold)"
              fillOpacity={0.13}
            />
          )}
          {done.length > 1 && (
            <path d={smoothPath(done)} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Današnji dan — prsten, da se odmah vidi dokle je nedelja stigla. */}
          {todayPt && (
            <circle cx={todayPt.x} cy={todayPt.y} r={4.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={2.5} />
          )}

          {week.map((cell, i) => {
            const isToday = cell.date_key === today
            const isRest = restDays.includes(weekdayNum(i))
            return (
              <text
                key={cell.date_key}
                x={PAD + i * STEP}
                y={88}
                textAnchor="middle"
                fontSize={10}
                fill={isToday ? 'var(--gold)' : 'var(--text-muted)'}
                fontWeight={isToday ? 600 : 400}
                opacity={isRest && !isToday ? 0.55 : 1}
              >
                {t.insights.weekdaysShort[i]}
              </text>
            )
          })}
        </svg>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {totalDone === 0 ? t.insights.thisWeekEmpty : t.insights.thisWeekHint}
      </p>
    </div>
  )
}
