'use client'

// Dva datuma zakazanog zadatka stoje jedan ispod drugog, isto oblikovana, da se
// vidi da su DVE različite stvari:
//   ▶️ Krećem — dan kad ti se zadatak pojavi u planu (for_date)
//   📅 Rok    — do kada mora da bude gotov (deadline_date, opciono)
// Ranije je "Krećem" bio samo sitan datum ispod naslova, pa se nije ni video.

import { formatDate } from '@/lib/utils'
import { useT, useLocale } from '@/components/i18n/I18nProvider'

export default function WhenFields({
  startDate, deadlineEnabled, onToggleDeadline, deadlineDate, onDeadlineChange,
}: {
  startDate: string
  deadlineEnabled: boolean
  onToggleDeadline: () => void
  deadlineDate: string
  onDeadlineChange: (v: string) => void
}) {
  const t = useT()
  const locale = useLocale()
  return (
    <div className="flex flex-col gap-2">
      <span className="section-label">{t.when.heading}</span>

      {/* Krećem — nije izmenjiv ovde; bira se klikom na dan u kalendaru */}
      <div
        className="px-3.5 py-3 rounded-[var(--r-md)] border"
        style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {t.when.start}
          </span>
          <span className="text-sm font-semibold text-right" style={{ color: 'var(--gold)' }}>
            {formatDate(startDate, locale)}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.when.startHint}
        </p>
      </div>

      {/* Rok */}
      <div>
        <button
          type="button"
          onClick={onToggleDeadline}
          aria-pressed={deadlineEnabled}
          className="w-full px-3.5 py-3 rounded-[var(--r-md)] border text-left transition-colors"
          style={{
            background: deadlineEnabled ? 'var(--gold-tint)' : 'var(--surface2)',
            borderColor: deadlineEnabled ? 'var(--gold)' : 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
              {t.when.deadline}
            </span>
            <div
              className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all shrink-0"
              style={{
                background: deadlineEnabled ? 'var(--gold)' : 'var(--border)',
                justifyContent: deadlineEnabled ? 'flex-end' : 'flex-start',
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.when.deadlineHint}
          </p>
        </button>

        {deadlineEnabled && (
          <input
            type="date"
            value={deadlineDate}
            min={startDate}
            onChange={e => onDeadlineChange(e.target.value)}
            aria-label={t.when.deadlineDateAria}
            className="field h-11 px-3 text-sm w-full mt-2"
          />
        )}
      </div>
    </div>
  )
}
