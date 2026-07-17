'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Routine } from '@/types/ferox'
import { useT } from '@/components/i18n/I18nProvider'

export default function RoutineModal({
  open, onClose, routines, onApply,
}: {
  open: boolean
  onClose: () => void
  routines: Routine[]
  onApply: (r: Routine) => void
}) {
  const t = useT()
  return (
    <Modal open={open} onClose={onClose} titleId="routine-modal-title">
      <div className="flex items-center justify-between">
        <h3 id="routine-modal-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>{t.routine.title}</h3>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-4 flex flex-col gap-2">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.routine.empty}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.routine.emptyHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {routines.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onApply(r); onClose() }}
              className="w-full text-left rounded-[var(--r-md)] p-4 transition-colors"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {r.tasks.map(t => t.name).join(' · ')}
              </p>
            </button>
          ))}
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={onClose}>{t.common.close}</Button>
    </Modal>
  )
}
