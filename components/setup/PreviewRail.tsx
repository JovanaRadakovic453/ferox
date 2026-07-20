'use client'

import Button from '@/components/ui/Button'
import { useT } from '@/components/i18n/I18nProvider'

export default function PreviewRail({
  isSutraMode, taskCount, apptCount, totalItems, canSubmit, loading, onSubmit,
}: {
  isSutraMode: boolean
  taskCount: number
  apptCount: number
  totalItems: number
  canSubmit: boolean
  loading: boolean
  onSubmit: () => void
}) {
  const t = useT()
  const totalWord = t.setup.itemsWord(totalItems)

  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 rail-sticky">
      <div className="card p-6 flex flex-col gap-5">
        <div>
          <p className="section-label mb-2">{t.setup.preview}</p>
          <h2 className="title-serif text-2xl" style={{ color: 'var(--text)' }}>
            {isSutraMode ? t.setup.tomorrowPlan : t.setup.todayPlan}
          </h2>
        </div>

        <div className="rounded-[var(--r-sm)] p-4 text-center" style={{ background: 'var(--surface2)' }}>
          <p className="display text-4xl foil leading-none">{totalItems}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{totalWord}</p>
        </div>

        {taskCount > 0 && apptCount > 0 && (
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {taskCount} {t.setup.taskWord(taskCount)} · {apptCount} {t.setup.apptWord(apptCount)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={onSubmit}>
          {totalItems > 0 ? t.setup.makePlanN(totalItems, totalWord) : t.setup.makePlan}
        </Button>

        {!canSubmit && !loading && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {t.setup.needOne}
          </p>
        )}
      </div>
    </aside>
  )
}
