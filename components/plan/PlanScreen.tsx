'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'

// Van komponente — preživljava navigaciju unutar istog tab-a
let _audioCtx: AudioContext | null = null
import { createClient } from '@/lib/supabase/client'
import { addDays } from '@/lib/date'
import { formatDate } from '@/lib/utils'
import type { Task, Appointment, DayEntry, UserProfile, TaskType, Priority } from '@/types/ferox'
import Button from '@/components/ui/Button'
import { useCountUp } from '@/lib/useCountUp'
import DayProgress from '@/components/plan/DayProgress'
import { useToast } from '@/components/ui/Toast'
import { DEFAULTS } from '@/lib/config'
import TaskItem from '@/components/plan/TaskItem'
import AppointmentItem from '@/components/plan/AppointmentItem'
import ActionRail from '@/components/plan/ActionRail'
import AddTaskModal from '@/components/plan/AddTaskModal'
import RoutineModal from '@/components/plan/RoutineModal'
import ReminderBanner from '@/components/plan/ReminderBanner'
import { AnimatePresence } from 'framer-motion'
import type { Routine } from '@/types/ferox'

export default function PlanScreen({
  entry, tasks: initialTasks, appointments, profile, dayFinished = false, tomorrowPlanned = false, isToday = true, hasDateParam = false, streak = 0, tomorrowScheduledCount = 0,
}: {
  entry: DayEntry
  tasks: Task[]
  appointments: Appointment[]
  profile: UserProfile
  dayFinished?: boolean
  tomorrowPlanned?: boolean
  isToday?: boolean
  hasDateParam?: boolean
  streak?: number
  tomorrowScheduledCount?: number
}) {
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [appts, setAppts] = useState<Appointment[]>(appointments)
  const [savingEod, setSavingEod] = useState(false)
  const [dayJustFinished, setDayJustFinished] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showRoutines, setShowRoutines] = useState(false)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [activeReminder, setActiveReminder] = useState<{ name: string; time: string; minutesBefore: number } | null>(null)

  const REMINDER_KEY = `ferox-shown-reminders-${entry.date_key}`

  function wasShown(id: string): boolean {
    try {
      const stored: string[] = JSON.parse(sessionStorage.getItem(REMINDER_KEY) ?? '[]')
      return stored.includes(id)
    } catch { return false }
  }

  function markShown(id: string) {
    try {
      const stored: string[] = JSON.parse(sessionStorage.getItem(REMINDER_KEY) ?? '[]')
      if (!stored.includes(id)) {
        sessionStorage.setItem(REMINDER_KEY, JSON.stringify([...stored, id]))
      }
    } catch {}
  }

  const doneTasks = tasks.filter(t => t.done).length
  const doneAppts = appts.filter(a => a.done).length
  const done = doneTasks + doneAppts
  const total = tasks.length + appts.length
  const allDone = done === total && total > 0
  const doneDisplay = useCountUp(done)

  const fireConfetti = useCallback((isLast: boolean) => {
    if (typeof window === 'undefined') return
    const gold = '#C9A84C'
    const cream = '#F5ECD7'
    const white = '#FFFFFF'
    if (isLast) {
      // Grand finale — dupli top pucanj
      const shared = { particleCount: 120, spread: 80, colors: [gold, cream, white, '#E8D5A3', '#B8963C'] }
      confetti({ ...shared, origin: { x: 0.3, y: 0.6 }, angle: 60 })
      confetti({ ...shared, origin: { x: 0.7, y: 0.6 }, angle: 120 })
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: [gold, cream, white], scalar: 1.2 })
      }, 200)
    } else {
      // Mali pljusak rasut po celom ekranu — 3 nasumične tačke
      const colors = [gold, cream, white]
      ;[
        { x: Math.random() * 0.4 + 0.1, y: Math.random() * 0.4 + 0.1 },
        { x: Math.random() * 0.4 + 0.5, y: Math.random() * 0.4 + 0.1 },
        { x: Math.random() * 0.6 + 0.2, y: Math.random() * 0.3 + 0.5 },
      ].forEach(origin => {
        confetti({ particleCount: 25, spread: 70, origin, colors, scalar: 0.9, gravity: 1.1 })
      })
    }
  }, [])

  // Otključava _audioCtx na svakom kliku — preživljava navigaciju jer je van komponente
  useEffect(() => {
    const ensureAudio = () => {
      if (!_audioCtx) {
        try { _audioCtx = new AudioContext() } catch { return }
      }
      if (_audioCtx.state === 'suspended') { _audioCtx.resume() }
    }
    document.addEventListener('click', ensureAudio)
    return () => document.removeEventListener('click', ensureAudio)
  }, [])

  async function playReminder() {
    try {
      if (!_audioCtx) return
      if (_audioCtx.state !== 'running') await _audioCtx.resume()
      ;[660, 880].forEach((freq, i) => {
        const ctx = _audioCtx!
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.6)
        osc.start(ctx.currentTime + i * 0.25)
        osc.stop(ctx.currentTime + i * 0.25 + 0.6)
      })
    } catch {}
  }

  // Proverava svake 30s da li je vreme za podsetnik; pamti koji su već prikazani
  useEffect(() => {
    if (!isToday) return

    const checkReminders = () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      const now = new Date()
      for (const appt of appts) {
        if (!appt.id || appt.reminder < 0) continue
        if (wasShown(appt.id)) continue

        const [h, m] = appt.time.split(':').map(Number)
        const apptTime = new Date(); apptTime.setHours(h, m, 0, 0)
        const reminderTime = new Date(apptTime.getTime() - (appt.reminder || 0) * 60_000)
        // Dajemo 15 min grace posle početka termina — da baner okine i ako korisnica
        // kasni da otvori plan ili je vreme podsetnika upravo prošlo.
        const graceEnd = new Date(apptTime.getTime() + 15 * 60_000)

        if (now >= reminderTime && now < graceEnd) {
          markShown(appt.id)
          void playReminder()
          setActiveReminder({ name: appt.name, time: appt.time, minutesBefore: appt.reminder })
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`📅 ${appt.name}`, {
              body: `Počinje za ${appt.reminder} min · ${appt.time}h`,
              icon: '/icon.svg',
            })
          }
        }
      }
    }

    checkReminders()
    const interval = setInterval(checkReminders, 30_000)
    return () => clearInterval(interval)
  }, [appts, isToday])

  // Optimistički toggle PO ID-u (ne po imenu — dva ista naziva se više ne sudaraju).
  // Na grešku vraćamo stanje i nudimo retry preko toasta.
  async function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newDone = !task.done
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone } : t))

    if (newDone && profile.micro_feedback !== false) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
      const totalCount = tasks.length + appts.length
      const doneNow = tasks.filter(t => (t.id === taskId ? true : t.done)).length + appts.filter(a => a.done).length
      const isLast = totalCount > 0 && doneNow === totalCount
      fireConfetti(isLast)
      if (isLast) toast({ message: 'Sve gotovo za danas! 🎉', variant: 'success' })
    }

    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ done: newDone }).eq('id', taskId)
    if (error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !newDone } : t))
      toast({ message: 'Nije sačuvano — proveri internet', variant: 'error', action: { label: 'Pokušaj', onClick: () => toggleTask(taskId) } })
    }
  }

  async function resetDay() {
    if (!window.confirm('Obrisati sve podatke za danas i početi ispočetka?')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const dateKey = entry.date_key
    if (entry.id) {
      await supabase.from('tasks').delete().eq('user_id', user.id).eq('entry_id', entry.id)
      await supabase.from('day_entries').delete().eq('user_id', user.id).eq('id', entry.id)
    }
    await supabase.from('appointments').delete().eq('user_id', user.id).eq('date_key', dateKey)
    await supabase.from('transferred_tasks').delete().eq('user_id', user.id).eq('for_date', dateKey)
    window.location.reload()
  }

  async function deleteAppointment(apptId: string) {
    const appt = appts.find(a => a.id === apptId)
    if (!appt) return
    setAppts(prev => prev.filter(a => a.id !== apptId))
    const supabase = createClient()
    const { error } = await supabase.from('appointments').delete().eq('id', apptId)
    if (error) {
      setAppts(prev => [...prev, appt])
      toast({ message: 'Brisanje nije uspelo — pokušaj ponovo', variant: 'error' })
    }
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      setTasks(prev => [...prev, task])
      toast({ message: 'Brisanje nije uspelo — pokušaj ponovo', variant: 'error' })
    }
  }

  async function toggleAppointment(apptId: string) {
    const appt = appts.find(a => a.id === apptId)
    if (!appt) return
    const newDone = !appt.done
    setAppts(prev => prev.map(a => a.id === apptId ? { ...a, done: newDone } : a))

    if (newDone && profile.micro_feedback !== false) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
      const totalCount = tasks.length + appts.length
      const doneNow = tasks.filter(t => t.done).length + appts.filter(a => (a.id === apptId ? true : a.done)).length
      fireConfetti(totalCount > 0 && doneNow === totalCount)
    }

    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ done: newDone }).eq('id', apptId)
    if (error) {
      setAppts(prev => prev.map(a => a.id === apptId ? { ...a, done: !newDone } : a))
      toast({ message: 'Nije sačuvano — proveri internet', variant: 'error', action: { label: 'Pokušaj', onClick: () => toggleAppointment(apptId) } })
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('routines').select('*').eq('user_id', entry.user_id!).order('created_at')
      .then(({ data }) => { if (data) setRoutines(data as Routine[]) })
  }, [entry.user_id])

  async function applyRoutine(routine: Routine) {
    if (!routine.tasks.length) return
    const supabase = createClient()
    const inserts = routine.tasks.map((t, i) => ({
      entry_id: entry.id, user_id: entry.user_id, name: t.name,
      done: false, priority: t.priority, type: t.type, note: '', position: tasks.length + i,
      block_index: t.block_index ?? null,
    }))
    const { data, error } = await supabase.from('tasks').insert(inserts).select('id, name, type, priority, note, done, position, block_index')
    if (error) { toast({ message: 'Rutina nije primenjena — pokušaj ponovo', variant: 'error' }); return }
    setTasks(prev => [...prev, ...(data ?? []).map(t => ({ ...t, done: false as const }))])
    toast({ message: `Rutina "${routine.name}" primenjena ✓`, variant: 'success' })
  }

  function startFinishDay() {
    const unfinished = tasks.filter(t => !t.done)
    finishDay(unfinished)
  }

  async function finishDay(tasksToTransfer: Task[]) {
    setSavingEod(true)

    try {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      // finished_at je server-autoritativni marker da je dan završen (izvor istine).
      await supabase.from('day_entries')
        .update({ finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', entry.id!)

      if (user && tasksToTransfer.length > 0) {
        // Nedovršene zadatke prenosimo na dan POSLE prikazanog dana.
        const nextKey = addDays(entry.date_key, 1)
        await supabase.from('transferred_tasks').upsert({
          user_id: user.id,
          tasks: tasksToTransfer.map(t => ({
            name: t.name, priority: t.priority, type: t.type, note: t.note ?? '', done: false,
          })),
          for_date: nextKey,
        }, { onConflict: 'user_id,for_date' })
      }
    } catch {
      // DB greška nije fatalna — nastavljamo sa završetkom dana
    }

    setSavingEod(false)
    setDayJustFinished(true)
  }

  async function handleAddTask({ name, type, priority, note }: { name: string; type: TaskType; priority: Priority; note: string }): Promise<boolean> {
    // .select('id') da novi zadatak odmah nosi id (za pouzdan toggle po ID-u).
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').insert({
      entry_id: entry.id, user_id: entry.user_id, name, done: false, priority, type, note, position: tasks.length,
    }).select('id').single()
    if (error) {
      toast({ message: 'Zadatak nije dodat — pokušaj ponovo', variant: 'error' })
      return false
    }
    setTasks(prev => [...prev, { id: data?.id, name, priority, type, note, done: false }])
    return true
  }

  async function handleAddAppointment({ name, time, reminder }: { name: string; time: string; reminder: number }): Promise<boolean> {
    const supabase = createClient()
    const { data, error } = await supabase.from('appointments').insert({
      user_id: entry.user_id, date_key: entry.date_key, name, time, reminder, done: false,
    }).select('id').single()
    if (error) {
      toast({ message: 'Termin nije dodat — pokušaj ponovo', variant: 'error' })
      return false
    }
    // Ako je vreme podsetnika već prošlo u momentu dodavanja → tiho označi kao prikazano
    if (data?.id && reminder > 0) {
      const [h, m] = time.split(':').map(Number)
      const apptTime = new Date(); apptTime.setHours(h, m, 0, 0)
      const reminderTime = new Date(apptTime.getTime() - reminder * 60_000)
      if (new Date() >= reminderTime) markShown(data.id)
    }
    setAppts(prev => [...prev, { id: data?.id, name, time, reminder, done: false }])
    return true
  }

  if (dayJustFinished || (dayFinished && isToday && !hasDateParam)) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center gap-8 px-4">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="text-6xl">🌙</span>
          <h1 className="display text-4xl" style={{ color: 'var(--gold)' }}>Dan završen</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Odmori se — sutra je novi dan.</p>
        </div>
        {tomorrowPlanned && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + addDays(entry.date_key, 1) }}>
              🌙 Pogledaj plan za sutra →
            </Button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-7 lg:gap-9 pb-2">
      {!isToday && (
        <Link href="/history" className="flex items-center gap-1.5 text-sm font-medium -mb-1" style={{ color: 'var(--text-muted)' }}>
          ← Istorija
        </Link>
      )}
      <AnimatePresence>
        {activeReminder && (
          <ReminderBanner
            key="reminder"
            name={activeReminder.name}
            time={activeReminder.time}
            minutesBefore={activeReminder.minutesBefore}
            onClose={() => setActiveReminder(null)}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex items-end justify-between gap-4 pt-1">
        <div className="min-w-0">
          <div className="hidden lg:block mb-2"><span className="section-label">{formatDate(entry.date_key)}</span></div>
          <h1 className="display foil text-3xl lg:text-5xl">
            {isToday ? 'Moj plan' : 'Plan'}
          </h1>
          {!isToday && (
            <p className="text-xs font-medium mt-0.5 lg:hidden" style={{ color: 'var(--gold)' }}>
              🌙 {formatDate(entry.date_key)}
            </p>
          )}
          {streak > 0 && (
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-2" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
              🔥 {streak} {streak === 1 ? 'dan' : streak < 5 ? 'dana' : 'dana'} zaredom
            </span>
          )}
        </div>
        <div className="text-right shrink-0 pl-3">
          <p className="display text-5xl lg:text-6xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>
            {doneDisplay}<span className="text-2xl lg:text-3xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
          </p>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase mt-1.5" style={{ color: 'var(--text-muted)' }}>završeno</p>
        </div>
      </header>

      {/* Baner kad je dan završen */}
      {dayFinished && (
        <div className="rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3" style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)' }}>
          <span className="text-xl">🌙</span>
          <div className="text-sm">
            <p className="font-medium">Danas je završen</p>
            {tomorrowPlanned && <p className="opacity-70">Plan za sutra je spreman</p>}
          </div>
        </div>
      )}

      {/* Podsetnik: sutra ima zakazanih zadataka iz kalendara */}
      {isToday && tomorrowScheduledCount > 0 && !dayFinished && (
        <div className="rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
          <span className="text-xl shrink-0">📅</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sutra imaš <span style={{ color: 'var(--text)', fontWeight: 600 }}>{tomorrowScheduledCount} zakazan{tomorrowScheduledCount === 1 ? '' : 'a'} zadatak{tomorrowScheduledCount === 1 ? '' : 'a'}</span> iz kalendara
          </p>
        </div>
      )}

      {/* Status traka — progres + voda (jedan red na desktopu) */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex-1">
          <DayProgress done={done} total={total} />
        </div>
        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
          {total > 0 ? Math.round((done / total) * 100) : 0}%
        </span>
      </div>

      {/* Telo — blokovi (glavna kolona) + akcije (rail na desktopu) */}
      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-9 lg:items-start">
        {/* Blokovi */}
        {total === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center gap-3">
            <span className="text-4xl">🗒️</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Plan je prazan. Dodaj prvi zadatak da krenemo.
            </p>
            <Button size="sm" onClick={() => setShowAddTask(true)}>➕ Dodaj zadatak</Button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="pl-6 pr-5">
              {[...appts].sort((a, b) => a.time.localeCompare(b.time)).map(a => (
                <AppointmentItem key={a.id ?? a.name + a.time} appt={a} onToggle={() => a.id && toggleAppointment(a.id)} onDelete={() => a.id && deleteAppointment(a.id)} />
              ))}
              {appts.length > 0 && tasks.length > 0 && (
                <div className="py-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
                  Zadaci
                </div>
              )}
              <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
                {[...tasks].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1)).map(task => (
                  <TaskItem key={task.id ?? task.name} task={task} onToggle={() => task.id && toggleTask(task.id)} onDelete={() => task.id && deleteTask(task.id)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Akcije */}
        <ActionRail
          dayFinished={dayFinished}
          isToday={isToday}
          tomorrowPlanned={tomorrowPlanned}
          allDone={allDone}
          savingEod={savingEod}
          onFinishDay={startFinishDay}
          onAddTask={() => setShowAddTask(true)}
          onRoutine={() => setShowRoutines(true)}
          onResetDay={resetDay}
        />
      </div>

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAddTask={handleAddTask}
        onAddAppointment={handleAddAppointment}
      />

      <RoutineModal
        open={showRoutines}
        onClose={() => setShowRoutines(false)}
        routines={routines}
        onApply={applyRoutine}
      />
    </main>
  )
}
