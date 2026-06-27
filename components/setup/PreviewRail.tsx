import Button from '@/components/ui/Button'

export default function PreviewRail({
  isSutraMode, taskCount, taskWord, apptCount, totalItems, totalWord, canSubmit, loading, onSubmit,
}: {
  isSutraMode: boolean
  taskCount: number
  taskWord: string
  apptCount: number
  totalItems: number
  totalWord: string
  canSubmit: boolean
  loading: boolean
  onSubmit: () => void
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 rail-sticky">
      <div className="card p-6 flex flex-col gap-5">
        <div>
          <p className="section-label mb-2">Pregled</p>
          <h2 className="title-serif text-2xl" style={{ color: 'var(--text)' }}>
            {isSutraMode ? 'Sutrašnji plan' : 'Današnji plan'}
          </h2>
        </div>

        <div className="rounded-[var(--r-md)] p-4 text-center" style={{ background: 'var(--surface2)' }}>
          <p className="display text-4xl foil leading-none">{totalItems}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{totalWord}</p>
        </div>

        {taskCount > 0 && apptCount > 0 && (
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {taskCount} {taskWord} · {apptCount} {apptCount === 1 ? 'termin' : 'termina'}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={onSubmit}>
          {totalItems > 0 ? `Napravi plan · ${totalItems} ${totalWord} →` : 'Napravi moj plan →'}
        </Button>

        {!canSubmit && !loading && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            📋 Dodaj bar jedan zadatak ili termin
          </p>
        )}
      </div>
    </aside>
  )
}
