'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import InstallBanner from '@/components/nav/InstallBanner'
import ThemeToggle from '@/components/ui/ThemeToggle'
import BreakAlarmOverlay from '@/components/extras/BreakAlarmOverlay'
import { useT } from '@/components/i18n/I18nProvider'
import LineIcon, { type IconName } from '@/components/ui/LineIcon'
import type { Dict } from '@/lib/i18n/dict'

// Chrome visibility. Pages with their own full-width bottom CTA (e.g. SetupScreen)
// call setHidden(true) on mount to avoid a double bar. This hides ONLY the mobile
// bottom bar — the desktop sidebar always stays.
type ChromeValue = { setHidden: (v: boolean) => void }
const ChromeCtx = createContext<ChromeValue>({ setHidden: () => {} })
export function useChrome() { return useContext(ChromeCtx) }

// Naziv se ne piše ovde nego se vadi iz rečnika — `label` bira ključ.
// Ikona je tanka linija (ne emodži) i uzima boju stavke: siva kad miruje,
// zlatna kad je stranica otvorena.
const TABS: { href: string; label: (t: Dict) => string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/',          label: (t: Dict) => t.nav.today,    icon: 'sun',      match: (p: string) => p === '/' || p.startsWith('/plan') },
  { href: '/calendar',  label: (t: Dict) => t.nav.calendar, icon: 'calendar', match: (p: string) => p.startsWith('/calendar') },
  { href: '/history',   label: (t: Dict) => t.nav.history,  icon: 'history',  match: (p: string) => p.startsWith('/history') },
  { href: '/insights',  label: (t: Dict) => t.nav.insights, icon: 'chart',    match: (p: string) => p.startsWith('/insights') },
  { href: '/extras',    label: (t: Dict) => t.nav.extras,   icon: 'tools',    match: (p: string) => p.startsWith('/extras') },
  { href: '/settings',  label: (t: Dict) => t.nav.settings, icon: 'gear',     match: (p: string) => p.startsWith('/settings') },
]

export default function AppChrome({ children, streak = 0 }: { children: ReactNode; streak?: number }) {
  const [hidden, setHidden] = useState(false)
  const pathname = usePathname() ?? '/'
  const onOnboarding = pathname.startsWith('/onboarding')
  const showMobileNav = !hidden && !onOnboarding

  // Onboarding owns the full viewport (its own split-screen layout) — no chrome.
  if (onOnboarding) {
    return (
      <ChromeCtx.Provider value={{ setHidden }}>
        <div className="min-h-dvh flex flex-col">{children}</div>
      </ChromeCtx.Provider>
    )
  }

  return (
    <ChromeCtx.Provider value={{ setHidden }}>
      <div className="app-shell">
        <Sidebar pathname={pathname} streak={streak} />

        <div className="app-viewport">
          <div className="app-content">
            <div className={`w-full flex-1 flex flex-col ${showMobileNav ? 'pb-28 lg:pb-0' : ''}`}>
              {children}
            </div>
          </div>
        </div>

        {showMobileNav && <MobileNav pathname={pathname} />}
        {showMobileNav && <InstallBanner />}
      </div>

      <BreakAlarmOverlay />
    </ChromeCtx.Provider>
  )
}

/* ── Desktop left rail ─────────────────────────────────────────── */
function Sidebar({ pathname, streak }: { pathname: string; streak: number }) {
  const t = useT()
  return (
    <aside className="app-sidebar">
      <Link href="/" aria-label={t.nav.home} className="flex items-center gap-2.5 px-2 mb-7">
        <span
          className="grid place-items-center w-9 h-9 rounded-[12px] text-white logo text-xl shrink-0"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--gold-light), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }}
          aria-hidden
        >
          F
        </span>
        <span className="logo text-[1.65rem] leading-none foil">Ferox</span>
      </Link>

      <nav aria-label={t.nav.main} className="flex flex-col gap-1">
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className="nav-item">
              <span className="nav-ico" aria-hidden><LineIcon name={tab.icon} size={19} /></span>
              {tab.label(t)}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {streak > 0 && (
        <div className="px-2 mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[var(--r-md)] w-full" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
            <LineIcon name="flame" size={15} /><span>{t.nav.streak(streak)}</span>
          </span>
        </div>
      )}

      <div className="px-1">
        <ThemeToggle compact />
      </div>
    </aside>
  )
}

/* ── Mobile bottom bar ─────────────────────────────────────────── */
function MobileNav({ pathname }: { pathname: string }) {
  const t = useT()
  return (
    <nav aria-label={t.nav.main} className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-40 px-3">
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
              className="flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-[var(--r-md)] transition-colors active:scale-95"
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', background: active ? 'var(--gold-tint)' : 'transparent' }}
            >
              <span className="leading-none" aria-hidden><LineIcon name={tab.icon} size={20} /></span>
              <span className="nav-font text-[0.68rem] font-normal tracking-wide">{tab.label(t)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
