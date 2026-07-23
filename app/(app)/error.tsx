'use client'

import { useT } from '@/components/i18n/I18nProvider'
import LineIcon from '@/components/ui/LineIcon'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  return (
    <main className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
      <LineIcon name="alert" size={44} strokeWidth={1.3} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
      <h1 className="title-serif text-2xl" style={{ color: 'var(--text)' }}>{t.common.somethingWrong}</h1>
      <p className="text-sm max-w-[30ch]" style={{ color: 'var(--text-muted)' }}>
        {t.common.errorBody}
      </p>
      <button
        onClick={reset}
        className="text-sm font-semibold px-5 py-2.5 rounded-[var(--r-md)] text-[var(--gold-fg)]"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--gold), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }}
      >
        {t.common.tryAgain}
      </button>
    </main>
  )
}
