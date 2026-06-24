'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import CoachSheet from '@/components/chat/CoachSheet'
import InstallBanner from '@/components/nav/InstallBanner'

// Chrome (bottom TabBar) visibility. Pages with their own full-width bottom CTA
// (e.g. SetupScreen) call setHidden(true) on mount to avoid a double bar.
type ChromeValue = { setHidden: (v: boolean) => void }
const ChromeCtx = createContext<ChromeValue>({ setHidden: () => {} })
export function useChrome() { return useContext(ChromeCtx) }

const TABS = [
  { href: '/',         label: 'Danas',       icon: '☀️', match: (p: string) => p === '/' || p.startsWith('/plan') },
  { href: '/history',  label: 'Istorija',    icon: '🗓️', match: (p: string) => p.startsWith('/history') },
  { href: '/insights', label: 'Uvidi',       icon: '📈', match: (p: string) => p.startsWith('/insights') },
  { href: '/settings', label: 'Podešavanja', icon: '⚙️', match: (p: string) => p.startsWith('/settings') },
]

export default function AppChrome({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const pathname = usePathname() ?? '/'
  const onOnboarding = pathname.startsWith('/onboarding')
  const showTabBar = !hidden && !onOnboarding

  return (
    <ChromeCtx.Provider value={{ setHidden }}>
      <div className={showTabBar ? 'pb-28' : ''}>{children}</div>
      {showTabBar && (
        <button
          onClick={() => setCoachOpen(true)}
          aria-label="Ferox coach"
          className="fixed right-4 bottom-24 z-40 w-12 h-12 rounded-full grid place-items-center text-xl active:scale-95 transition-transform"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--gold), var(--gold-deep))', color: '#fff', boxShadow: 'var(--sh-gold)' }}
        >
          💬
        </button>
      )}
      {showTabBar && <TabBar pathname={pathname} />}
      {showTabBar && <InstallBanner />}
      <CoachSheet open={coachOpen} onClose={() => setCoachOpen(false)} />
    </ChromeCtx.Provider>
  )
}

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Glavna navigacija" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-40 px-3">
      <div
        className="glass mb-3 rounded-[var(--r-lg)] px-1.5 py-1.5 flex items-center justify-around pb-safe"
        style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--sh-md)' }}
      >
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-[var(--r-md)] transition-colors active:scale-95"
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
            >
              <span className="text-lg leading-none" aria-hidden>{tab.icon}</span>
              <span className="text-[0.6rem] font-medium tracking-wide">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
