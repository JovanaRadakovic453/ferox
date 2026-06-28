import type { ReactNode } from 'react'
import type { TaskType, Priority } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'

export const ENERGY_OPTIONS = [
  { level: 1, emoji: '🔥', label: 'Pun gas',     desc: 'Spreman/a za sve', tint: 'rgba(212,116,42,0.18)' },
  { level: 2, emoji: '😊', label: 'Dobro',        desc: 'Solidna energija', tint: 'rgba(190,120,45,0.15)' },
  { level: 3, emoji: '😐', label: 'Prosečno',     desc: 'Idem kako idem',   tint: 'rgba(150,125,80,0.15)' },
  { level: 4, emoji: '🥱', label: 'Umorno',       desc: 'Teži dan',         tint: 'rgba(105,110,125,0.15)' },
  { level: 5, emoji: '🪫', label: 'Preživljavam', desc: 'Minimalan mod',    tint: 'rgba(90,100,120,0.16)' },
]

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high',   label: '🔴 Visok' },
  { value: 'medium', label: '🟡 Srednji' },
  { value: 'low',    label: '🟢 Nizak' },
]

export const EMPTY_TASK = { name: '', note: '', priority: 'medium' as Priority, type: 'light' as TaskType }
export const EMPTY_APPT = { name: '', time: '09:00', reminder: DEFAULTS.reminderMinutes }
export const EMPTY_APPT_REMINDER = { value: DEFAULTS.reminderMinutes, unit: 'min' as 'min' | 'sat' }

/** Tidy section header: tinted icon chip + tracked uppercase label + optional trailing slot. */
export function SectionHeader({ icon, title, trailing }: { icon: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-8 h-8 rounded-[10px] text-base shrink-0" style={{ background: 'var(--surface2)' }}>
          {icon}
        </span>
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  )
}

/** Signal-strength style energy meter (more bars = more energy). */
export function EnergyMeter({ strength, active }: { strength: number; active: boolean }) {
  return (
    <span className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden>
      {[1, 2, 3, 4, 5].map(b => (
        <span
          key={b}
          className="w-[3.5px] rounded-full transition-all duration-300"
          style={{
            height: `${7 + b * 3}px`,
            background: b <= strength
              ? (active ? 'rgba(255,255,255,0.95)' : 'var(--gold)')
              : (active ? 'rgba(255,255,255,0.32)' : 'var(--border)'),
          }}
        />
      ))}
    </span>
  )
}

export function CountChip({ n }: { n: number }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
      {n}
    </span>
  )
}
