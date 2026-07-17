import type { ReactNode } from 'react'
import type { TaskType, Priority } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'

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

export function CountChip({ n }: { n: number }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
      {n}
    </span>
  )
}
