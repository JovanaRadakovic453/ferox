'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type ToastVariant = 'error' | 'success' | 'info'
type ToastAction = { label: string; onClick: () => void }
type ToastItem = { id: number; message: string; variant: ToastVariant; action?: ToastAction }
type ToastInput = { message: string; variant?: ToastVariant; action?: ToastAction; duration?: number }

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx.toast
}

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])
  const toast = useCallback((input: ToastInput) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message: input.message, variant: input.variant ?? 'info', action: input.action }])
    const dur = input.duration ?? (input.action ? 6000 : 3500)
    setTimeout(() => remove(id), dur)
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[100] flex flex-col items-center gap-2 w-full max-w-[420px] px-4 pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-full rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3 text-sm"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${t.variant === 'error' ? 'rgba(192,57,43,0.45)' : t.variant === 'success' ? 'rgba(34,197,94,0.45)' : 'var(--border)'}`,
                boxShadow: 'var(--sh-lg)',
                color: 'var(--text)',
              }}
            >
              <span className="text-base shrink-0">{t.variant === 'error' ? '⚠️' : t.variant === 'success' ? '✓' : 'ℹ️'}</span>
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); remove(t.id) }}
                  className="text-xs font-semibold shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--gold)' }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
