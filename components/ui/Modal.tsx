'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'

/** Accessible, focus-trapped dialog. role=dialog, Escape, scroll-lock,
 *  framer-motion entrance, reduced-motion safe. Reused by all sheets/modals.
 *  placement: 'center' = bottom-sheet on mobile → centered dialog on desktop.
 *             'drawer'  = bottom-sheet on mobile → right side-drawer on desktop. */
export default function Modal({
  open, onClose, title, titleId, placement = 'center', children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  titleId?: string
  placement?: 'center' | 'drawer'
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const prevFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'Tab') trapFocus(e, panelRef.current)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')
        ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      el?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
      prevFocused?.focus?.()
    }
  }, [open, onClose])

  const isDrawer = placement === 'drawer'
  const containerCls = isDrawer
    ? 'fixed inset-0 z-50 flex items-end lg:items-stretch justify-center lg:justify-end p-0'
    : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'
  const panelCls = isDrawer
    ? 'w-full max-h-[90dvh] lg:max-h-none lg:h-dvh lg:w-[27rem] rounded-t-[var(--r-xl)] lg:rounded-none lg:rounded-l-[var(--r-xl)] p-5 lg:p-6 flex flex-col gap-4'
    : 'w-full max-w-[460px] max-h-[90dvh] rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] p-5 sm:p-6 flex flex-col gap-4'

  // Drawer slides from the right on desktop; everything else lifts from the bottom.
  const sideDrawer = isDrawer && desktop
  const initial = sideDrawer ? { opacity: 0, x: 48 } : { opacity: 0, y: 24, scale: 0.98 }
  const animate = sideDrawer ? { opacity: 1, x: 0 } : { opacity: 1, y: 0, scale: 1 }
  const exit = sideDrawer ? { opacity: 0, x: 48 } : { opacity: 0, y: 16, scale: 0.98 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={containerCls}
          style={{ background: 'rgba(26,23,20,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-labelledby={titleId}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`${panelCls} overflow-y-auto`}
            style={{ background: 'var(--surface)', boxShadow: 'var(--sh-lg)', border: '1px solid var(--hairline)' }}
          >
            <div className={`${isDrawer ? 'lg:hidden' : 'sm:hidden'} mx-auto w-10 h-1 rounded-full -mt-1 mb-1 shrink-0`} style={{ background: 'var(--border)' }} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('disabled'))
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
