'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/i18n/I18nProvider'
import LineIcon from '@/components/ui/LineIcon'

type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const t = useT()
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (localStorage.getItem('ferox_install_dismissed')) return
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!evt) return null

  return (
    <div
      className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-40 z-40 w-full max-w-[480px] px-4"
    >
      <div className="glass rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3" style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--sh-md)' }}>
        <LineIcon name="phone" size={19} style={{ color: 'var(--gold)' }} />
        <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>{t.common.installBanner}</p>
        <button
          onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null) }}
          className="text-xs font-semibold px-3 py-1.5 rounded-full text-white shrink-0"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--gold), var(--gold-deep))' }}
        >
          {t.common.add}
        </button>
        <button
          onClick={() => { localStorage.setItem('ferox_install_dismissed', '1'); setEvt(null) }}
          aria-label={t.common.close}
          className="text-sm opacity-50 hover:opacity-100 shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
