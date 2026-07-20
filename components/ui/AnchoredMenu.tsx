'use client'

import { useState, type ReactNode } from 'react'
import LineIcon, { type IconName } from '@/components/ui/LineIcon'

/**
 * Mali meni koji iskoči ispod dugmeta. Koristi FIKSNU poziciju (računa se od
 * dugmeta) jer kartica sa `overflow:hidden` inače odseče meni za stavke pri dnu.
 * Klik van menija ga zatvara (nevidljiva pozadina).
 */
export default function AnchoredMenu({
  ariaLabel, title, icon = 'clock', minWidth = 190, children,
}: {
  ariaLabel: string
  title: string
  icon?: IconName
  minWidth?: number
  /** `close` zatvara meni — pozovi ga kad se izbor potvrdi. */
  children: (close: () => void) => ReactNode
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const open = pos !== null

  function close() { setPos(null) }

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (open) { close(); return }
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
  }

  return (
    <>
      <button
        onClick={toggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        title={title}
        className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <LineIcon name={icon} size={16} />
      </button>

      {open && pos && (
        <>
          {/* Nevidljiva pozadina — zatvara meni na klik van njega */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
            style={{ background: 'transparent' }}
          />
          <div
            className="fixed z-50 p-1.5 flex flex-col gap-0.5"
            style={{
              top: pos.top,
              right: pos.right,
              minWidth,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--sh-lg)',
            }}
          >
            {children(close)}
          </div>
        </>
      )}
    </>
  )
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <div
      className="px-2.5 pt-1 pb-1.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </div>
  )
}

export function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left text-sm px-2.5 py-2 rounded-[var(--r-sm)] transition-colors"
      style={{ color: 'var(--text)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}
