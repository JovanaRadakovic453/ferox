'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { t, resetTimer } from '@/lib/breakTimer'

export default function BreakAlarmOverlay() {
  const [alarming, setAlarming] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => setAlarming(t.alarming), 500)
    return () => clearInterval(id)
  }, [])

  function dismiss() {
    resetTimer()
    setAlarming(false)
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {alarming && (
        <motion.div
          key="alarm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 1.5rem',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            key="alarm-card"
            initial={{ scale: 0.88, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="card p-8 flex flex-col items-center gap-5 w-full max-w-sm text-center"
            style={{ border: '2px solid var(--gold)', boxShadow: 'var(--sh-gold)' }}
          >
            <span className="text-5xl animate-pulse">⏰</span>
            <div>
              <p className="title-serif text-2xl" style={{ color: 'var(--text)' }}>Odmor je gotov!</p>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Vreme je da nastaviš sa radom.</p>
            </div>
            <button
              onClick={dismiss}
              className="w-full py-3.5 rounded-[var(--r-md)] font-semibold text-sm transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: 'var(--gold)', color: 'white' }}
            >
              ⏹ Zaustavi alarm
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
