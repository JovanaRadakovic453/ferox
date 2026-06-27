'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function ReminderBanner({
  name,
  time,
  minutesBefore,
  onClose,
}: {
  name: string
  time: string
  minutesBefore: number
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 30_000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[var(--r-md)] px-4 py-4 flex items-start gap-3"
      style={{
        background: 'var(--gold-tint)',
        border: '1.5px solid var(--gold)',
        boxShadow: 'var(--sh-lg)',
      }}
      role="alert"
    >
      <span className="text-2xl shrink-0 mt-0.5">📅</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Podsetnik — termin za {minutesBefore} {minutesBefore === 1 ? 'minut' : minutesBefore < 5 ? 'minuta' : 'minuta'}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {name} · {time}h
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold shrink-0 mt-0.5 transition-opacity hover:opacity-70"
        style={{ color: 'var(--gold)' }}
      >
        Zatvori
      </button>
    </motion.div>
  )
}
