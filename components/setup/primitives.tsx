import type { ReactNode } from 'react'
import type { TaskType, Priority } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'
import LineIcon, { type IconName } from '@/components/ui/LineIcon'

export const EMPTY_TASK = { name: '', note: '', priority: 'medium' as Priority, type: 'light' as TaskType }
export const EMPTY_APPT = { name: '', time: '09:00', reminder: DEFAULTS.reminderMinutes }
export const EMPTY_APPT_REMINDER = { value: DEFAULTS.reminderMinutes, unit: 'min' as 'min' | 'sat' }

// Ikone su zajedničke sa navigacijom — vidi components/ui/LineIcon.tsx.
export type SectionIconName = Extract<IconName, 'sparkle' | 'list' | 'calendar' | 'history'>

/** Zaglavlje sekcije: tanka linijska ikona + razmaknuti verzal + opcioni desni slot. */
export function SectionHeader({ icon, title, trailing }: { icon: SectionIconName; title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <LineIcon name={icon} size={17} className="shrink-0" style={{ color: 'var(--gold)' }} />
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
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-[7px] tabular-nums"
      style={{ color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
    >
      {n}
    </span>
  )
}
