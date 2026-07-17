'use client'

import { useId } from 'react'

/**
 * Zlatni kružni indikator napretka ("brojčanik") — deljen između Uvida i
 * EOD ekrana. Animacija je čist CSS keyframe (ringIn u globals.css); poštuje
 * prefers-reduced-motion kroz globalni media block.
 */
export default function ProgressRing({
  pct, size = 148, stroke = 10, sublabel = '',
}: {
  pct: number
  size?: number
  stroke?: number
  sublabel?: string
}) {
  const gradId = useId()
  const clamped = Math.max(0, Math.min(100, pct))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - clamped / 100)

  return (
    <div
      className="relative shrink-0 grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% ${sublabel}`}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-light)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--surface2)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          className="ring-anim"
          style={{
            strokeDasharray: circ,
            strokeDashoffset: offset,
            ['--ring-circ' as string]: circ,
          }}
        />
      </svg>
      <div className="flex flex-col items-center" aria-hidden>
        <span className="display leading-none tabular-nums" style={{ color: 'var(--text)', fontSize: size * 0.24 }}>
          {clamped}%
        </span>
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mt-1" style={{ color: 'var(--text-muted)' }}>
          {sublabel}
        </span>
      </div>
    </div>
  )
}
