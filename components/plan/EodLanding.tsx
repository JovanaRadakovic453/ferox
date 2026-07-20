'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import ProgressRing from '@/components/ui/ProgressRing'
import { useT } from '@/components/i18n/I18nProvider'
import { isSundayKey } from '@/lib/week'
import { enableMorningReminder } from '@/lib/push'
import LineIcon from '@/components/ui/LineIcon'

export default function EodLanding({
  doneCount,
  total,
  transferredCount,
  dateKey,
  eodRecap = null,
  streak = 0,
  pushEnabled = true,
}: {
  doneCount: number
  total: number
  transferredCount: number
  dateKey: string
  eodRecap?: string | null
  streak?: number
  /** Ima li korisnik već uključen jutarnji podsetnik. false → ponudi mu ga. */
  pushEnabled?: boolean
}) {
  const t = useT()
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const [recap, setRecap] = useState<string | null>(eodRecap)
  const [recapFailed, setRecapFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [reopening, setReopening] = useState(false)
  const [reminderState, setReminderState] = useState<'ask' | 'busy' | 'on' | 'failed'>('ask')
  const [reopenFailed, setReopenFailed] = useState(false)

  // Izlaz sa ovog ekrana. Bez njega je „Završi dan" ćorsokak: kliknut greškom,
  // dan ostaje zatvoren do ponoći. Ništa se ne briše — vidi /api/day/reopen.
  async function backToPlan() {
    setReopening(true)
    setReopenFailed(false)
    try {
      const res = await fetch('/api/day/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateKey }),
      })
      if (!res.ok) throw new Error('reopen')
      // Pun reload, ne router.push — ova strana se bira na serveru po `finished_at`.
      window.location.href = '/plan'
    } catch {
      setReopening(false)
      setReopenFailed(true)
    }
  }

  useEffect(() => {
    if (recap) return
    let cancelled = false
    setRecapFailed(false)
    fetch('/api/ai/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        if (d?.recap) setRecap(d.recap)
        else setRecapFailed(true)
      })
      .catch(() => { if (!cancelled) setRecapFailed(true) })
    return () => { cancelled = true }
  }, [recap, dateKey, attempt])

  return (
    <main className="flex flex-col gap-6 lg:gap-7 pb-2 lg:max-w-2xl lg:mx-auto lg:w-full">
      <header className="pt-6 lg:pt-10 text-center flex flex-col items-center gap-3">
        <LineIcon name="moon" size={46} strokeWidth={1.2} style={{ color: 'var(--gold)' }} />
        <h1 className="display text-4xl lg:text-5xl" style={{ color: 'var(--gold)' }}>{t.eod.title}</h1>
        <p className="text-sm lg:text-base" style={{ color: 'var(--text-muted)' }}>
          {t.eod.restUp}
        </p>
        {streak > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
            {t.plan.streak(streak)}
          </span>
        )}
      </header>

      {recap && (
        <div className="card p-5 lg:p-7">
          <p className="text-sm lg:text-base italic leading-relaxed" style={{ color: 'var(--text)' }}>„{recap}”</p>
        </div>
      )}

      {/* Jutarnji podsetnik se nudi TEK OVDE, a ne u onboardingu.
          Dozvola tražena pre nego što korisnik vidi ikakvu korist redovno se odbija —
          a odbijena dozvola se vraća samo ručno kroz podešavanja pregledača, pa se
          kanal trajno zatvori. Ovde je upravo završio dan: korist je vidljiva, a
          pitanje ("da te podsetim sutra?") je prirodno. */}
      {!pushEnabled && reminderState !== 'on' && (
        <div className="card p-5 flex flex-col gap-2">
          <p className="text-sm lg:text-base font-medium" style={{ color: 'var(--text)' }}>
            {t.eod.reminderTitle}
          </p>
          <p className="text-xs lg:text-sm" style={{ color: 'var(--text-muted)' }}>
            {reminderState === 'failed' ? t.eod.reminderFailed : t.eod.reminderSub}
          </p>
          {reminderState !== 'failed' && (
            <button
              onClick={async () => {
                setReminderState('busy')
                setReminderState(await enableMorningReminder() ? 'on' : 'failed')
              }}
              disabled={reminderState === 'busy'}
              className="self-start mt-1 px-3.5 py-2 text-sm font-medium rounded-[var(--r-md)] transition-opacity disabled:opacity-50"
              style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}
            >
              {t.eod.reminderYes}
            </button>
          )}
        </div>
      )}

      {reminderState === 'on' && (
        <p className="text-sm text-center" style={{ color: 'var(--ok)' }}>{t.eod.reminderOn}</p>
      )}

      {/* Nedelja uveče = kraj nedelje. Grafikon u Uvidima radi tiho cele nedelje, pa
          bi ga korisnik lako propustio — ovo je jedini put kad ga pozovemo da pogleda.
          Poziv, ne prekid: obična veza, bez modala i bez potvrde. */}
      {isSundayKey(dateKey) && (
        <Link
          href="/insights"
          className="card p-5 flex items-center justify-between gap-3 transition-opacity hover:opacity-80"
        >
          <p className="text-sm lg:text-base flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
            <LineIcon name="trophy" size={17} style={{ color: 'var(--gold)' }} />
            {t.insights.weekDoneNudge}
          </p>
          <span aria-hidden style={{ color: 'var(--gold)' }}>→</span>
        </Link>
      )}

      {!recap && recapFailed && (
        <div className="card p-5 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.eod.recapUnavailable}
          </p>
          <button
            onClick={() => setAttempt(a => a + 1)}
            className="text-sm font-semibold shrink-0 transition-opacity hover:opacity-75"
            style={{ color: 'var(--gold)' }}
          >
            {t.eod.tryAgain}
          </button>
        </div>
      )}

      <div className="card p-6 lg:p-7 flex items-center gap-6 lg:gap-8">
        <ProgressRing pct={pct} size={124} />
        <div className="min-w-0 flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
            {t.eod.doneLabel}
          </p>
          <p className="display text-5xl lg:text-6xl leading-none" style={{ color: 'var(--text)' }}>
            {doneCount}
            <span className="text-2xl lg:text-3xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {transferredCount > 0 ? t.eod.transferred(transferredCount) : t.eod.allClear}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-4">
        <button
          onClick={backToPlan}
          disabled={reopening}
          className="text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-75 disabled:opacity-50"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
        >
          {reopening ? t.eod.reopening : t.eod.backToPlan}
        </button>
        {reopenFailed && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{t.eod.reopenFailed}</p>
        )}
        <LogoutButton />
      </div>
    </main>
  )
}
