'use client'

import { useState, useEffect } from 'react'
import { useChrome } from '@/components/nav/AppChrome'
import { todayKey, formatDate } from '@/lib/utils'
import type { Task, TaskType, Priority, Appointment, UserProfile, Zone } from '@/types/ferox'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import TransferSuggestions from '@/components/setup/TransferSuggestions'
import BrainDumpCard from '@/components/setup/BrainDumpCard'
import TaskEditor from '@/components/setup/TaskEditor'
import AppointmentEditor from '@/components/setup/AppointmentEditor'
import PreviewRail from '@/components/setup/PreviewRail'

export default function SetupScreen({ profile, targetDate, transferredTasks = [], scheduledSuggestions = [], initialAppointments = [], showTransferBanner = false, scheduledTaskIds = [], streak = 0, zones = [] }: { profile: UserProfile; targetDate?: string; transferredTasks?: Task[]; scheduledSuggestions?: Task[]; initialAppointments?: Appointment[]; showTransferBanner?: boolean; scheduledTaskIds?: string[]; streak?: number; zones?: Zone[] }) {
  const [tasks, setTasks] = useState<Task[]>(showTransferBanner ? [] : transferredTasks)
  const [suggestedTransfers, setSuggestedTransfers] = useState<Task[]>(showTransferBanner ? transferredTasks : [])
  const [suggestedScheduled, setSuggestedScheduled] = useState<Task[]>(showTransferBanner ? scheduledSuggestions : [])
  const [appointments, setAppointments] = useState<Appointment[]>(showTransferBanner ? [] : initialAppointments)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [brainDumpLoading, setBrainDumpLoading] = useState(false)

  // Nedovršen plan (draft): pamte se SAMO korisnikovi zadaci i termini (njegov rad),
  // da prežive odlazak na drugu stranicu / osvežavanje. Predlozi (preneseni i zakazani)
  // uvek dolaze sveži sa servera — ne pamte se, da stari draft ne bi sakrio nove predloge.
  const draftKey = `ferox-draft-${targetDate ?? todayKey()}`
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw) as { tasks?: Task[]; appointments?: Appointment[] }
        const dTasks = d.tasks ?? []
        const dAppts = d.appointments ?? []
        if (dTasks.length) setTasks(dTasks)
        if (dAppts.length) setAppointments(dAppts)
        // Ukloni iz predloga stavke koje je korisnik već ubacio u editor (po nazivu),
        // da se ne pojave dvaput.
        const taskNames = new Set(dTasks.map(t => t.name))
        if (taskNames.size) {
          setSuggestedTransfers(prev => prev.filter(t => !taskNames.has(t.name)))
          setSuggestedScheduled(prev => prev.filter(t => !taskNames.has(t.name)))
        }
      }
    } catch { /* localStorage nedostupan — radi bez drafta */ }
    setHydrated(true)
  }, [draftKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ tasks, appointments }))
    } catch { /* ignore */ }
  }, [hydrated, draftKey, tasks, appointments])

  type GoogleEvent = { id: string; title: string; time: string | null; endTime: string | null }
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [googleAdded, setGoogleAdded] = useState<Set<string>>(new Set())
  const [googleNeedsReconnect, setGoogleNeedsReconnect] = useState(false)

  useEffect(() => {
    if (!profile.google_refresh_token) return
    const date = targetDate ?? todayKey()
    fetch(`/api/integrations/google/events?date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.needsReconnect) setGoogleNeedsReconnect(true)
        if (json?.events?.length) setGoogleEvents(json.events)
      })
      .catch(() => {})
  }, [targetDate, profile.google_refresh_token])
  const isSutraMode = targetDate !== undefined && targetDate !== todayKey()

  const { setHidden } = useChrome()
  useEffect(() => { setHidden(true); return () => setHidden(false) }, [setHidden])

  function addTask(draft: { name: string; note: string; priority: Priority; type: TaskType; zone_id: string | null }) {
    setTasks(prev => [...prev, { ...draft, done: false }])
  }
  function addAppointment(a: { name: string; time: string; reminder: number; zone_id: string | null }) {
    setAppointments(prev => [...prev, { ...a, done: false }])
  }
  function onBrainDumpExtracted(extracted: Task[], extractedAppts: Appointment[]) {
    if (extracted.length) setTasks(prev => [...prev, ...extracted])
    if (extractedAppts.length) setAppointments(prev => [...prev, ...extractedAppts])
  }
  // Predlozi (preneseni + zakazani) su samo lokalni dok se plan ne napravi.
  // Snimanje/markiranje "done" radi server u createDay (preko scheduledTaskIds),
  // pa dodavanje/odbacivanje NE dira bazu — inače bi zadaci nestali pre snimanja.
  function addAllSuggested() {
    setTasks(prev => [...prev, ...suggestedTransfers])
    setSuggestedTransfers([])
  }
  function addSuggested(index: number) {
    setTasks(prev => [...prev, suggestedTransfers[index]])
    setSuggestedTransfers(prev => prev.filter((_, i) => i !== index))
  }
  function dismissSuggested(index: number) {
    setSuggestedTransfers(prev => prev.filter((_, i) => i !== index))
  }
  function addAllScheduled() {
    setTasks(prev => [...prev, ...suggestedScheduled])
    setSuggestedScheduled([])
  }
  function addScheduled(index: number) {
    setTasks(prev => [...prev, suggestedScheduled[index]])
    setSuggestedScheduled(prev => prev.filter((_, i) => i !== index))
  }
  function dismissScheduled(index: number) {
    setSuggestedScheduled(prev => prev.filter((_, i) => i !== index))
  }

  async function resetDay() {
    if (!window.confirm('Obrisati sve podatke za danas i početi ispočetka?')) return
    setResetting(true)
    const dateKey = targetDate ?? todayKey()
    await fetch('/api/day/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey }),
    })
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
    window.location.reload()
  }

  async function handleSubmit() {
    if ((tasks.length + appointments.length) === 0) return
    setLoading(true)
    setSubmitError(null)

    try {
      const dateKey = targetDate ?? todayKey()

      const res = await fetch('/api/day/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateKey,
          tasks,
          appointments,
          scheduledTaskIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error?.message ?? 'Greška pri čuvanju plana')
        setLoading(false)
        return
      }

      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      const isToday = dateKey === todayKey()
      window.location.href = isToday ? '/plan' : `/plan?date=${dateKey}`
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Greška mreže')
      setLoading(false)
    }
  }

  const totalItems = tasks.length + appointments.length
  const canSubmit = totalItems > 0 && !brainDumpLoading

  // Google događaji koji još nisu dodati (ni u ovoj sesiji, ni ranije kao termin).
  const apptNames = new Set(appointments.map(a => a.name))
  const visibleGoogleEvents = googleEvents.filter(e => !googleAdded.has(e.id) && !apptNames.has(e.title))

  const hour = new Date().getHours()
  const dayPart = hour < 5 ? 'Dobro veče' : hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče'
  const heroTitle = isSutraMode ? 'Planiramo sutra' : dayPart
  const heroSub = isSutraMode
    ? 'Pripremi sutrašnji dan na miru — zakaži ga dok je sveže. 🌙'
    : 'Dodaj zadatke i zakazane termine za danas.'
  const taskWord = tasks.length === 1 ? 'zadatak' : 'zadataka'
  const totalWord = totalItems === 1 ? 'zadatak' : totalItems < 5 ? 'zadatka' : 'zadataka'

  return (
    <>
      {/* Overlay animacija dok se pravi plan */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'var(--bg)', animation: 'backdropIn 0.45s ease forwards' }}
        >
          <div
            className="flex flex-col items-center gap-7"
            style={{ animation: 'riseIn 0.6s var(--ease-out) 0.1s both' }}
          >
            {/* F badge */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 26,
                background: 'var(--gold)',
                boxShadow: 'var(--sh-gold), 0 0 64px rgba(212,116,42,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'linear-gradient(160deg, var(--gold-light) 0%, var(--gold) 55%, var(--gold-deep) 100%)',
              }}
            >
              <span
                className="display"
                style={{ color: '#fff', fontSize: '3rem', textShadow: '0 2px 10px rgba(0,0,0,0.18)' }}
              >
                F
              </span>
            </div>

            {/* Ferox wordmark */}
            <span
              className="display foil"
              style={{ fontSize: '2.1rem', letterSpacing: '0.1em' }}
            >
              Ferox
            </span>

            {/* Status + shimmer linija */}
            <div className="flex flex-col items-center gap-4">
              <p
                className="text-[0.68rem] font-semibold uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}
              >
                Izrada plana
              </p>
              <div style={{ width: 110, height: 1, borderRadius: 1, overflow: 'hidden' }}>
                <div className="luxury-loader-line" style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex flex-col gap-7 pb-44 lg:pb-12">
        {targetDate && targetDate !== todayKey() && (
          <Link href="/plan" className="flex items-center gap-1.5 text-sm font-medium -mb-3" style={{ color: 'var(--text-muted)' }}>
            ← Danas
          </Link>
        )}
        <header className="flex flex-col gap-5 pt-2 animate-fade-slide">
          <div className="flex items-center justify-between lg:hidden">
            <span className="display foil text-2xl tracking-[0.06em]">Ferox</span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap"
                style={streak > 0
                  ? { background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }
                  : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
              >
                🔥 {streak}
              </span>
              <span
                className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--text-muted)', boxShadow: 'var(--sh-xs)' }}
              >
                {formatDate(targetDate ?? todayKey())}
              </span>
            </div>
          </div>
          <div>
            <div className="hidden lg:flex lg:items-center lg:gap-3 mb-3">
              <span className="section-label">{formatDate(targetDate ?? todayKey())}</span>
              {streak > 0 ? (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
                >
                  🔥 {streak} {streak === 1 ? 'dan' : 'dana'}
                </span>
              ) : (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--hairline)' }}
                >
                  🔥 Započni svoj niz
                </span>
              )}
            </div>
            <h1 className="title-serif text-[2.15rem] lg:text-[2.9rem] leading-[1.08]" style={{ color: 'var(--text)' }}>
              {heroTitle},<br />
              <span className="foil">{profile.name}</span>
            </h1>
            <p className="text-sm mt-3 max-w-[42ch]" style={{ color: 'var(--text-muted)' }}>
              {heroSub}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start">
          <div className="flex flex-col gap-7 stagger">

            {suggestedTransfers.length > 0 && (
              <TransferSuggestions
                items={suggestedTransfers}
                onAddAll={addAllSuggested}
                onAddOne={addSuggested}
                onDismiss={dismissSuggested}
                title="Iz prethodnog dana"
                icon="📋"
              />
            )}

            {suggestedScheduled.length > 0 && (
              <TransferSuggestions
                items={suggestedScheduled}
                onAddAll={addAllScheduled}
                onAddOne={addScheduled}
                onDismiss={dismissScheduled}
                title="Zakazani zadaci"
                icon="📅"
              />
            )}

            <TaskEditor
              tasks={tasks}
              onAdd={addTask}
              onRemove={i => setTasks(prev => prev.filter((_, idx) => idx !== i))}
              onUpdate={(i, patch) => setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))}
              zones={zones}
            />

            {googleNeedsReconnect && (
              <div className="card p-4 flex items-center justify-between gap-3" style={{ border: '1px solid var(--hairline)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Google Kalendar veza je istekla — poveži ponovo u Podešavanjima.
                </span>
                <Link
                  href="/settings"
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
                >
                  Podešavanja →
                </Link>
              </div>
            )}

            {visibleGoogleEvents.length > 0 && (
              <div className="card p-4 flex flex-col gap-3" style={{ border: '1px solid var(--hairline)' }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="section-label">Iz Google Kalendara</span>
                </div>
                {visibleGoogleEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{event.title}</span>
                      {event.time && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        addAppointment({ name: event.title, time: event.time ?? '09:00', reminder: 0, zone_id: null })
                        setGoogleAdded(prev => new Set([...prev, event.id]))
                      }}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
                    >
                      + Dodaj
                    </button>
                  </div>
                ))}
              </div>
            )}

            <AppointmentEditor appointments={appointments} onAdd={addAppointment} onRemove={i => setAppointments(prev => prev.filter((_, idx) => idx !== i))} zones={zones} />

            <BrainDumpCard onExtracted={onBrainDumpExtracted} onLoadingChange={setBrainDumpLoading} />

            {submitError && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm" style={{
                background: submitError.startsWith('✅') ? 'var(--ok-tint)' : 'var(--danger-tint)',
                color: submitError.startsWith('✅') ? 'var(--ok)' : 'var(--danger)',
              }}>
                {submitError}
              </div>
            )}

            <div className="h-px" style={{ background: 'var(--hairline)' }} />
            <button
              onClick={resetDay}
              disabled={resetting}
              className="w-full text-xs text-center py-2.5 opacity-45 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              {resetting ? 'Brišem...' : '🗑️ Obriši sve za danas i počni iznova'}
            </button>
          </div>

          <PreviewRail
            isSutraMode={isSutraMode}
            taskCount={tasks.length}
            taskWord={taskWord}
            apptCount={appointments.length}
            totalItems={totalItems}
            totalWord={totalWord}
            canSubmit={canSubmit}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[540px] z-40">
        <div className="glass px-5 min-[540px]:px-9 pt-3.5 pb-safe" style={{ borderTop: '1px solid var(--hairline)' }}>
          <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={handleSubmit}>
            {totalItems > 0 ? `Napravi plan · ${totalItems} ${totalWord} →` : 'Napravi moj plan →'}
          </Button>
          {!canSubmit && !loading && (
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              📋 Dodaj bar jedan zadatak ili termin
            </p>
          )}
        </div>
      </div>
    </>
  )
}
