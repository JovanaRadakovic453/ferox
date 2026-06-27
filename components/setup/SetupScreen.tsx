'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChrome } from '@/components/nav/AppChrome'
import { calcSleepHours, todayKey, formatDate } from '@/lib/utils'
import { addDays } from '@/lib/date'
import { energyLabel } from '@/lib/energy'
import { isHeavy, capacity } from '@/lib/plan'
import type { Task, TaskType, Priority, Appointment, UserProfile } from '@/types/ferox'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import TransferSuggestions from '@/components/setup/TransferSuggestions'
import SleepCard from '@/components/setup/SleepCard'
import EnergySelector from '@/components/setup/EnergySelector'
import BrainDumpCard from '@/components/setup/BrainDumpCard'
import TaskEditor from '@/components/setup/TaskEditor'
import AppointmentEditor from '@/components/setup/AppointmentEditor'
import PreviewRail from '@/components/setup/PreviewRail'

export default function SetupScreen({ profile, targetDate, transferredTasks = [], initialAppointments = [], initialEnergy = null, showTransferBanner = false }: { profile: UserProfile; targetDate?: string; transferredTasks?: Task[]; initialAppointments?: Appointment[]; initialEnergy?: number | null; showTransferBanner?: boolean }) {
  // Pri ponovnom otvaranju plana (edit) vraćamo izabranu energiju da dugme
  // "Napravi plan" ne ostane bezrazložno disabled.
  const [energy, setEnergy] = useState<number | null>(initialEnergy)
  const [wakeTime, setWakeTime] = useState(profile.start_time ?? '08:00')
  const [sleepTime, setSleepTime] = useState(profile.last_sleep_time ?? profile.sleep_time ?? '23:00')
  // showTransferBanner=true → tasks su iz transferred_tasks (opt-in), ne pre-učitavaj ih automatski
  // showTransferBanner=false → tasks su iz postojećeg day_entry (edit mode), pre-učitaj ih
  const [tasks, setTasks] = useState<Task[]>(showTransferBanner ? [] : transferredTasks)
  const [suggestedTransfers, setSuggestedTransfers] = useState<Task[]>(showTransferBanner ? transferredTasks : [])
  const [appointments, setAppointments] = useState<Appointment[]>(showTransferBanner ? [] : initialAppointments)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [overloadDismissed, setOverloadDismissed] = useState(false)
  const [brainDumpLoading, setBrainDumpLoading] = useState(false)
  const isSutraMode = targetDate !== undefined && targetDate !== todayKey()
  const sleepHours = calcSleepHours(sleepTime, wakeTime)

  // SetupScreen ima svoj sticky CTA na dnu — sakrij globalni TabBar dok je otvoren.
  const { setHidden } = useChrome()
  useEffect(() => { setHidden(true); return () => setHidden(false) }, [setHidden])

  // --- Task / appointment / transfer mutacije (lokalni nacrt; DB upis tek na submit) ---
  function addTask(draft: { name: string; note: string; priority: Priority; type: TaskType }) {
    setTasks(prev => [...prev, { ...draft, done: false }])
  }
  function addAppointment(a: { name: string; time: string; reminder: number }) {
    setAppointments(prev => [...prev, { ...a, done: false }])
  }
  function onBrainDumpExtracted(extracted: Task[], extractedAppts: Appointment[]) {
    if (extracted.length) setTasks(prev => [...prev, ...extracted])
    if (extractedAppts.length) setAppointments(prev => [...prev, ...extractedAppts])
  }
  function addAllSuggested() {
    setTasks(prev => [...prev, ...suggestedTransfers])
    setSuggestedTransfers([])
  }
  function addSuggested(index: number) {
    const t = suggestedTransfers[index]
    setTasks(prev => [...prev, t])
    setSuggestedTransfers(prev => prev.filter((_, i) => i !== index))
  }
  function dismissSuggested(index: number) {
    setSuggestedTransfers(prev => prev.filter((_, i) => i !== index))
  }

  async function resetDay() {
    if (!window.confirm('Obrisati sve podatke za danas i početi ispočetka?')) return
    setResetting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setResetting(false); return }
    const dateKey = targetDate ?? todayKey()
    const { data: existing } = await supabase
      .from('day_entries').select('id').eq('user_id', user.id).eq('date_key', dateKey).maybeSingle()
    if (existing) {
      await supabase.from('tasks').delete().eq('user_id', user.id).eq('entry_id', existing.id)
      await supabase.from('day_entries').delete().eq('user_id', user.id).eq('id', existing.id)
    }
    await supabase.from('appointments').delete().eq('user_id', user.id).eq('date_key', dateKey)
    await supabase.from('transferred_tasks').delete().eq('user_id', user.id).eq('for_date', dateKey)
    setResetting(false)
    window.location.reload()
  }

  async function handleSubmit() {
    if (!energy || (tasks.length + appointments.length) === 0) return
    setLoading(true)
    setSubmitError(null)

    try {
      const dateKey = targetDate ?? todayKey()

      const res = await fetch('/api/day/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateKey,
          energy: energyLabel(energy),
          energyLevel: energy, // canonical 1=best (picker level sent directly)
          sleepHours,
          sleepTime,
          wakeTime,
          tasks,
          appointments,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error?.message ?? 'Greška pri čuvanju plana')
        setLoading(false)
        return
      }

      // Idi na plan TAČNO onog datuma koji je upravo snimljen — nikad "naslepo"
      // na danas. Inače bi plan za sutra otvorio prazan današnji plan i bacio
      // korisnika na praznu početnu.
      const isToday = dateKey === todayKey()
      window.location.href = isToday ? '/plan' : `/plan?date=${dateKey}`
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Greška mreže')
      setLoading(false)
    }
  }

  // Overload guard — previše teških zadataka za izabranu energiju.
  const heavyCount = tasks.filter(isHeavy).length
  const energyCapacity = energy ? capacity(energy) : Infinity
  const overBy = energy ? Math.max(0, heavyCount - energyCapacity) : 0

  async function deferHeavy() {
    if (overBy <= 0) return
    const toDefer = tasks.filter(isHeavy).slice(-overBy)
    setTasks(prev => prev.filter(t => !toDefer.includes(t)))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nextKey = addDays(targetDate ?? todayKey(), 1)
    const { data: existing } = await supabase.from('transferred_tasks')
      .select('tasks').eq('user_id', user.id).eq('for_date', nextKey).maybeSingle()
    const prevTasks = (existing?.tasks ?? []) as Task[]
    await supabase.from('transferred_tasks').upsert({
      user_id: user.id,
      for_date: nextKey,
      tasks: [...prevTasks, ...toDefer.map(t => ({ name: t.name, priority: t.priority, type: t.type, note: t.note ?? '', done: false }))],
    }, { onConflict: 'user_id,for_date' })
  }

  const totalItems = tasks.length + appointments.length
  const canSubmit = energy !== null && totalItems > 0 && !brainDumpLoading

  // Pozdrav prema dobu dana (klijentski; samo za UI ton).
  const hour = new Date().getHours()
  const dayPart = hour < 5 ? 'Dobro veče' : hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče'
  const heroTitle = isSutraMode ? 'Planiramo sutra' : dayPart
  const heroSub = isSutraMode
    ? 'Pripremi sutrašnji dan na miru — zakaži ga dok je sveže. 🌙'
    : 'Oblikujmo dan prema energiji koju zaista imaš.'
  const taskWord = tasks.length === 1 ? 'zadatak' : 'zadataka'
  const totalWord = totalItems === 1 ? 'zadatak' : totalItems < 5 ? 'zadatka' : 'zadataka'

  return (
    <>
      <main className="flex flex-col gap-7 pb-44 lg:pb-12">
        {targetDate && targetDate !== todayKey() && (
          <Link href="/plan" className="flex items-center gap-1.5 text-sm font-medium -mb-3" style={{ color: 'var(--text-muted)' }}>
            ← Danas
          </Link>
        )}
        {/* Hero */}
        <header className="flex flex-col gap-5 pt-2 animate-fade-slide">
          <div className="flex items-center justify-between lg:hidden">
            <span className="display foil text-2xl tracking-[0.06em]">Ferox</span>
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--text-muted)', boxShadow: 'var(--sh-xs)' }}
            >
              {formatDate(targetDate ?? todayKey())}
            </span>
          </div>
          <div>
            <div className="hidden lg:block mb-3"><span className="section-label">{formatDate(targetDate ?? todayKey())}</span></div>
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
              />
            )}

            <SleepCard
              sleepTime={sleepTime}
              wakeTime={wakeTime}
              sleepHours={sleepHours}
              onSleepChange={setSleepTime}
              onWakeChange={setWakeTime}
            />

            <EnergySelector energy={energy} onSelect={setEnergy} />

            <BrainDumpCard onExtracted={onBrainDumpExtracted} onLoadingChange={setBrainDumpLoading} />

            <TaskEditor tasks={tasks} onAdd={addTask} onRemove={i => setTasks(prev => prev.filter((_, idx) => idx !== i))} />

            <AppointmentEditor appointments={appointments} onAdd={addAppointment} onRemove={i => setAppointments(prev => prev.filter((_, idx) => idx !== i))} />

            {energy !== null && overBy > 0 && !overloadDismissed && (
              <div className="rounded-[var(--r-md)] px-4 py-3.5 flex flex-col gap-3" style={{ background: 'var(--gold-tint)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  Danas si na <span className="font-semibold" style={{ color: 'var(--gold)' }}>{energyLabel(energy)}</span> — imaš {heavyCount} {heavyCount === 1 ? 'težak zadatak' : 'teža/težih zadataka'}, a realno je do {energyCapacity}. Da {overBy} {overBy === 1 ? 'najteži prebacimo' : 'najteža prebacimo'} za sutra?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={deferHeavy}>Prebaci {overBy} za sutra</Button>
                  <Button size="sm" variant="ghost" onClick={() => setOverloadDismissed(true)}>Ipak ostavi</Button>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-[var(--r-md)] px-4 py-3 text-sm" style={{
                background: submitError.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(192,57,43,0.10)',
                color: submitError.startsWith('✅') ? '#16a34a' : '#c0392b',
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

          {/* Pregled (rail na desktopu) — živi sažetak + CTA */}
          <PreviewRail
            isSutraMode={isSutraMode}
            energy={energy}
            taskCount={tasks.length}
            taskWord={taskWord}
            apptCount={appointments.length}
            totalItems={totalItems}
            totalWord={totalWord}
            sleepHours={sleepHours}
            heavyCount={heavyCount}
            energyCapacity={energyCapacity}
            overBy={overBy}
            canSubmit={canSubmit}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      {/* Sticky frosted CTA (mobilni/tablet) — uvek nadohvat palca */}
      <div className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[540px] z-40">
        <div className="glass px-5 min-[540px]:px-9 pt-3.5 pb-safe" style={{ borderTop: '1px solid var(--hairline)' }}>
          <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={handleSubmit}>
            {totalItems > 0 ? `Napravi plan · ${totalItems} ${totalWord} →` : 'Napravi moj plan →'}
          </Button>
          {!canSubmit && !loading && (
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {!energy ? '⚡ Izaberi nivo energije' : '📋 Dodaj bar jedan zadatak ili termin'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
