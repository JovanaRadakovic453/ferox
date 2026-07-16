'use client'

import { useState } from 'react'
import Checkbox from '@/components/ui/Checkbox'
import { PRIORITY_LABELS } from '@/types/ferox'
import type { Task } from '@/types/ferox'
import { addDays, todayKey, tomorrowKey } from '@/lib/date'

export default function TaskItem({ task, onToggle, onDelete, onSnooze }: {
  task: Task
  onToggle: () => void
  onDelete?: () => void
  /** Kad je prisleđeno, prikazuje se dugme „Odloži" (premesti zadatak na drugi dan). */
  onSnooze?: (targetDateKey: string) => void
}) {
  // Meni koristi fiksnu poziciju (računa se od dugmeta) da ga kartica sa
  // overflow:hidden ne bi odsekla za zadatke pri dnu spiska.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [pickDate, setPickDate] = useState(false)
  const menuOpen = menuPos !== null

  function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (menuOpen) { closeMenu(); return }
    const r = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
    setPickDate(false)
  }

  function closeMenu() {
    setMenuPos(null)
    setPickDate(false)
  }

  function snooze(target: string) {
    closeMenu()
    onSnooze?.(target)
  }

  return (
    <div className="relative flex items-center w-full py-4">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.name} — ${PRIORITY_LABELS[task.priority]}${task.done ? ', završeno' : ''}`}
        className="flex items-start gap-3 flex-1 min-w-0 text-left transition-transform active:scale-[0.995]"
      >
        <span className="mt-0.5" aria-hidden><Checkbox checked={task.done} /></span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[0.925rem] font-medium transition-all duration-200"
            style={{
              color: task.done ? 'var(--text-muted)' : 'var(--text)',
              textDecoration: task.done ? 'line-through' : 'none',
              opacity: task.done ? 0.6 : 1,
            }}
          >
            {task.name}
          </p>
          {task.note && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.note}</p>
          )}
        </div>
        <span
          className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 tracking-wide"
          title={PRIORITY_LABELS[task.priority]}
          style={{
            background: task.priority === 'high' ? 'var(--danger-tint)' : task.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
            color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          <span aria-hidden>{task.priority === 'high' ? 'V' : task.priority === 'medium' ? 'S' : 'N'}</span>
          <span className="sr-only">{PRIORITY_LABELS[task.priority]}</span>
        </span>
      </button>

      {onSnooze && !task.done && (
        <button
          onClick={openMenu}
          aria-label={`Odloži ${task.name} za drugi dan`}
          title="Odloži za drugi dan"
          className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          🕓
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Obriši ${task.name}`}
          className="shrink-0 ml-3 text-sm opacity-25 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      )}

      {menuOpen && menuPos && (
        <>
          {/* Nevidljiva pozadina — zatvara meni na klik van njega */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={closeMenu}
            className="fixed inset-0 z-40 cursor-default"
            style={{ background: 'transparent' }}
          />
          <div
            className="fixed z-50 p-1.5 flex flex-col gap-0.5"
            style={{
              top: menuPos.top,
              right: menuPos.right,
              minWidth: 190,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--sh-lg)',
            }}
          >
            <div className="px-2.5 pt-1 pb-1.5 text-[0.62rem] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Odloži za
            </div>
            <MenuItem label="Sutra" onClick={() => snooze(tomorrowKey())} />
            <MenuItem label="Prekosutra" onClick={() => snooze(addDays(todayKey(), 2))} />
            {!pickDate ? (
              <MenuItem label="Izaberi dan…" onClick={() => setPickDate(true)} />
            ) : (
              <div className="px-1.5 pt-1">
                <input
                  type="date"
                  min={tomorrowKey()}
                  autoFocus
                  onChange={(e) => { if (e.target.value) snooze(e.target.value) }}
                  className="w-full text-sm rounded-[var(--r-sm)] px-2 py-1.5"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
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
