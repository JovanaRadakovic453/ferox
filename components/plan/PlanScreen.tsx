'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'

// Van komponente — preživljava navigaciju unutar istog tab-a
let _audioCtx: AudioContext | null = null
import { createClient } from '@/lib/supabase/client'
import { addDays, todayKey } from '@/lib/date'
import { getDeadlineBadge, dueTasks, sortTasksForDay } from '@/lib/deadline'
import { formatDate } from '@/lib/utils'
import type { Task, Appointment, DayEntry, UserProfile, TaskType, Priority } from '@/types/ferox'
import Button from '@/components/ui/Button'
import { useCountUp } from '@/lib/useCountUp'
import DayProgress from '@/components/plan/DayProgress'
import { useToast } from '@/components/ui/Toast'
import { enqueueToggle, readQueue, writeQueue, isOffline } from '@/lib/offlineQueue'
import TaskItem from '@/components/plan/TaskItem'
import AppointmentItem from '@/components/plan/AppointmentItem'
import ActionRail from '@/components/plan/ActionRail'
import AddTaskModal from '@/components/plan/AddTaskModal'
import RoutineModal from '@/components/plan/RoutineModal'
import ReminderBanner from '@/components/plan/ReminderBanner'
import { AnimatePresence } from 'framer-motion'
import type { Routine, Locale } from '@/types/ferox'
import { useT, useLocale, useTimezone } from '@/components/i18n/I18nProvider'
import { readSkipped, clearSkipped } from '@/lib/googleSkip'
import type { Dict } from '@/lib/i18n/dict'

// Spaja "prenesene" zadatke bez dupliranja (po imenu, case-insensitive).
// Čuva već postojeće (npr. ranije odložene) i dodaje samo nove.
type TransferItem = { name: string; priority: Priority; type: TaskType; note: string; done: boolean; deadline_date?: string | null }
function mergeTransferred(existing: TransferItem[], incoming: TransferItem[]): TransferItem[] {
  const seen = new Set(existing.map(t => t.name.trim().toLowerCase()))
  return [...existing, ...incoming.filter(t => !seen.has(t.name.trim().toLowerCase()))]
}

// "danas"/"today" · "sutra"/"tomorrow" · "prekosutra" · pun datum — za poruke potvrde.
function dayLabel(key: string, t: Dict, locale: Locale, tz: string): string {
  const today = todayKey(tz)
  if (key === today) return t.common.today
  if (key === addDays(today, 1)) return t.common.tomorrow
  if (key === addDays(today, 2)) return t.common.dayAfter
  return formatDate(key, locale)
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)',
        opacity: 0.5,
      }}
    />
  )
}

export default function PlanScreen({
  entry, tasks: initialTasks, appointments, profile, dayFinished = false, tomorrowPlanned = false, isToday = true, hasDateParam = false, streak = 0, tomorrowScheduledCount = 0, overdueScheduled = [],
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
  /** Zakazani zadaci (još nisu u planu) kojima rok ističe danas ili je prošao. */
  overdueScheduled?: { name: string; deadline_date: string }[]
}) {
  const toast = useToast()
  const t = useT()
  const locale = useLocale()
  const tz = useTimezone()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [appts, setAppts] = useState<Appointment[]>(appointments)

  // Sklonjeni (✕) Google događaji ovog dana — u refu, da drugo sklanjanje ne
  // pregazi prvo (prop `entry` se ne osvežava bez reload-a).
  const googleDismissed = useRef<string[]>(entry.google_dismissed ?? [])

  // Google događaji tog dana se SAMI uvlače u plan — sa vremenom kao termin,
  // celodnevni kao običan zadatak — pa se odmah broje i mogu da se štikliraju,
  // bez ručnog "Dodaj". Server je idempotentan, a sklonjeni se ne vraćaju.
  useEffect(() => {
    if (!profile.google_refresh_token || dayFinished) return
    let cancelled = false
    // Događaji izbačeni (✕) još na ekranu za pravljenje plana — dan tada nije
    // postojao, pa ih server tek sada trajno pamti.
    const skipped = readSkipped(entry.date_key)
    fetch('/api/integrations/google/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: entry.date_key, dismiss: skipped }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((json: { imported?: Appointment[]; importedTasks?: Task[] } | null) => {
        if (cancelled || !json) return
        // Zapamćeno je na serveru — pregledač više ne mora da ih drži.
        if (skipped.length) {
          googleDismissed.current = Array.from(new Set([...googleDismissed.current, ...skipped]))
          clearSkipped(entry.date_key)
        }
        if (json.imported?.length) {
          setAppts(prev => {
            const known = new Set(prev.map(a => a.id))
            return [...prev, ...json.imported!.filter(a => !known.has(a.id))]
          })
        }
        if (json.importedTasks?.length) {
          setTasks(prev => {
            const known = new Set(prev.map(t => t.id))
            return [...prev, ...json.importedTasks!.filter(t => !known.has(t.id))]
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [entry.date_key, profile.google_refresh_token, dayFinished])
  // Koliko štikliranja čeka na mrežu (0 = sve poslato).
  const [pending, setPending] = useState(0)
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

  // Rokovi koji gore danas: iz plana (živo, nestaje čim štiklirasš) + iz kalendara.
  const dueNow: { name: string; deadline_date: string; scheduled: boolean }[] = [
    ...dueTasks(tasks, todayKey(tz)).map(t => ({ name: t.name, deadline_date: t.deadline_date as string, scheduled: false })),
    ...overdueScheduled.map(t => ({ name: t.name, deadline_date: t.deadline_date, scheduled: true })),
  ]

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
              body: t.reminder.notifBody(appt.reminder, appt.time),
              icon: '/icon.svg',
            })
          }
        }
      }
    }

    checkReminders()
    const interval = setInterval(checkReminders, 30_000)
    return () => clearInterval(interval)
  }, [appts, isToday, t])

  // Štikliranje bez interneta: izmene čekaju lokalno i šalju se čim se mreža vrati.
  // Pokušava se i pri otvaranju (mreža je mogla doći dok je app bio zatvoren).
  useEffect(() => {
    async function flush() {
      const queue = readQueue()
      setPending(queue.length)
      if (queue.length === 0 || isOffline()) return
      const supabase = createClient()
      const stuck: typeof queue = []
      for (const item of queue) {
        const { error } = await supabase.from('tasks').update({ done: item.done }).eq('id', item.taskId)
        if (error) { stuck.push(item); continue }
        if (item.scheduledId) {
          await supabase.from('scheduled_tasks').update({ done: item.done }).eq('id', item.scheduledId)
        }
      }
      writeQueue(stuck)
      setPending(stuck.length)
      if (stuck.length === 0) toast({ message: t.plan.offlineSynced, variant: 'success' })
    }

    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [t, toast])

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
      if (isLast) toast({ message: t.plan.allDone, variant: 'success' })
    }

    const supabase = createClient()
    const queueIt = () => {
      enqueueToggle({ taskId, done: newDone, scheduledId: task.scheduled_id ?? null })
      setPending(readQueue().length)
    }

    // Bez mreže ne pokušavaj i ne javljaj grešku — kvačica ostaje, upis ide u red.
    if (isOffline()) { queueIt(); return }

    const { error } = await supabase.from('tasks').update({ done: newDone }).eq('id', taskId)
    if (error) {
      // Mreža je mogla pući baš u tom trenutku — tada je red čekanja ispravniji
      // odgovor nego poruka o grešci, jer se izmena ne gubi.
      if (isOffline()) { queueIt(); return }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !newDone } : t))
      toast({ message: t.plan.notSaved, variant: 'error', action: { label: t.common.retry, onClick: () => toggleTask(taskId) } })
      return
    }

    // Zadatak došao iz Kalendara: štikliranje ZATVARA original, odštikliravanje ga
    // vraća. Bez ovoga bi se zakazan zadatak (koji sada ostaje dok se ne završi)
    // pojavljivao i sutra iako je odrađen. Vidi migraciju 0022.
    if (task.scheduled_id) {
      await supabase.from('scheduled_tasks').update({ done: newDone }).eq('id', task.scheduled_id)
    }
  }

  async function resetDay() {
    if (!window.confirm(t.plan.resetConfirm)) return
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
    // Termin uvučen iz Google-a se SKLANJA, ne briše: red ostaje kao "nadgrobni"
    // pa se događaj ne uvuče ponovo pri sledećem otvaranju. U Google-u ostaje.
    // Isto pamti i dan — jer ponovno pravljenje plana obriše sve termine tog
    // dana, pa bi se sklonjeni događaj bez toga vratio.
    if (appt.google_event_id) await markGoogleDismissed(supabase, appt.google_event_id)
    const { error } = appt.google_event_id
      ? await supabase.from('appointments').update({ dismissed: true }).eq('id', apptId)
      : await supabase.from('appointments').delete().eq('id', apptId)
    if (error) {
      setAppts(prev => [...prev, appt])
      toast({ message: t.plan.deleteFailed, variant: 'error' })
    }
  }

  /**
   * Dan pamti koje je Google događaje korisnik sklonio — inače bi se pri
   * sledećem otvaranju uvukli ponovo. Zapisuje se PRE brisanja zadatka: ako
   * upis padne, zadatak ostaje i ništa se tiho ne izgubi.
   */
  async function markGoogleDismissed(
    supabase: ReturnType<typeof createClient>, googleEventId: string,
  ): Promise<boolean> {
    if (!entry.id) return true
    const next = Array.from(new Set([...googleDismissed.current, googleEventId]))
    const { error } = await supabase.from('day_entries').update({ google_dismissed: next }).eq('id', entry.id)
    if (error) return false
    googleDismissed.current = next
    return true
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    const supabase = createClient()

    // Zadatak uvučen iz Google-a se stvarno briše (da ne visi u statistici kao
    // nezavršen), a dan zapamti da ga ne uvlači ponovo. U Google-u ostaje.
    if (task.google_event_id && !(await markGoogleDismissed(supabase, task.google_event_id))) {
      setTasks(prev => [...prev, task])
      toast({ message: t.plan.deleteFailed, variant: 'error' })
      return
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      setTasks(prev => [...prev, task])
      toast({ message: t.plan.deleteFailed, variant: 'error' })
    }
  }

  // "Odloži" — premesti JEDAN zadatak na drugi dan tokom dana (bez čekanja na "Završi dan").
  // Ako ciljni dan već ima plan → ubaci pravo u njega; ako ne → dodaj u "prenesene"
  // (isti mehanizam kao "Završi dan"), pa se pojavi kad se taj dan otvori.
  async function snoozeTask(taskId: string, targetDateKey: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const label = dayLabel(targetDateKey, t, locale, tz)

    // Optimistički: skloni zadatak sa današnjeg spiska odmah.
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setTasks(prev => [...prev, task])
      toast({ message: t.plan.snoozeFailed, variant: 'error' })
      return
    }

    const moved: TransferItem = { name: task.name, priority: task.priority, type: task.type, note: task.note ?? '', done: false, deadline_date: task.deadline_date ?? null }

    try {
      const { data: targetEntry } = await supabase
        .from('day_entries').select('id')
        .eq('user_id', user.id).eq('date_key', targetDateKey).maybeSingle()

      if (targetEntry) {
        // Ciljni dan već postoji → ubaci zadatak pravo u njegov spisak.
        const { error } = await supabase.from('tasks').insert({
          entry_id: targetEntry.id, user_id: user.id, name: task.name, done: false,
          priority: task.priority, type: task.type, note: task.note ?? '', position: 9999,
          deadline_date: task.deadline_date ?? null,
        })
        if (error) throw error
      } else {
        // Ciljni dan još ne postoji → dodaj u "prenesene" (spoji, ne pregazi).
        const { data: existing } = await supabase
          .from('transferred_tasks').select('tasks')
          .eq('user_id', user.id).eq('for_date', targetDateKey).maybeSingle()
        const merged = mergeTransferred((existing?.tasks ?? []) as TransferItem[], [moved])
        const { error } = await supabase.from('transferred_tasks')
          .upsert({ user_id: user.id, tasks: merged, for_date: targetDateKey }, { onConflict: 'user_id,for_date' })
        if (error) throw error
      }

      // Uvučen iz Google-a: dan mora da zapamti da je otišao, inače bi se sam
      // vratio pri sledećem otvaranju. Neuspeh ovde nije razlog da se pomeranje
      // poništi (kopija je već na ciljnom danu) — najgore je da se vrati.
      if (task.google_event_id) await markGoogleDismissed(supabase, task.google_event_id)

      // Tek kad je bezbedno smešten na ciljni dan — ukloni ga sa današnjeg.
      const { error: delErr } = await supabase.from('tasks').delete().eq('id', taskId)
      if (delErr) throw delErr

      toast({ message: t.plan.snoozed(label), variant: 'success' })
    } catch {
      setTasks(prev => [...prev, task])
      toast({ message: t.plan.snoozeFailed, variant: 'error' })
    }
  }

  // "Pomeri termin" — novi dan i/ili novo vreme. Termin je vezan za datum
  // (date_key), pa je pomeranje obična izmena ta dva polja.
  async function moveAppointment(apptId: string, targetDateKey: string, newTime: string) {
    const before = appts
    const appt = before.find(a => a.id === apptId)
    if (!appt) return

    const staysHere = targetDateKey === entry.date_key

    // Optimistički: ostaje isti dan → samo novo vreme; menja dan → silazi sa spiska.
    setAppts(cur => staysHere
      ? cur.map(a => a.id === apptId ? { ...a, time: newTime } : a)
      : cur.filter(a => a.id !== apptId))

    const supabase = createClient()
    const { error } = await supabase.from('appointments')
      .update({ date_key: targetDateKey, time: newTime }).eq('id', apptId)

    if (error) {
      setAppts(before)
      toast({ message: t.plan.moveFailed, variant: 'error' })
      return
    }

    toast({ message: t.plan.apptMoved(dayLabel(targetDateKey, t, locale, tz), newTime), variant: 'success' })
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
      toast({ message: t.plan.notSaved, variant: 'error', action: { label: t.common.retry, onClick: () => toggleAppointment(apptId) } })
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
    if (error) { toast({ message: t.plan.routineFailed, variant: 'error' }); return }
    setTasks(prev => [...prev, ...(data ?? []).map(t => ({ ...t, done: false as const }))])
    toast({ message: t.plan.routineApplied(routine.name), variant: 'success' })
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
        // Spajamo sa postojećim "prenesenim" (npr. ranije odloženim) da se ništa ne pregazi.
        const nextKey = addDays(entry.date_key, 1)
        const { data: existing } = await supabase.from('transferred_tasks')
          .select('tasks').eq('user_id', user.id).eq('for_date', nextKey).maybeSingle()
        const incoming: TransferItem[] = tasksToTransfer.map(t => ({
          name: t.name, priority: t.priority, type: t.type, note: t.note ?? '', done: false,
          deadline_date: t.deadline_date ?? null,
        }))
        const merged = mergeTransferred((existing?.tasks ?? []) as TransferItem[], incoming)
        await supabase.from('transferred_tasks').upsert({
          user_id: user.id, tasks: merged, for_date: nextKey,
        }, { onConflict: 'user_id,for_date' })
      }
    } catch {
      // DB greška nije fatalna — nastavljamo sa završetkom dana
    }

    setSavingEod(false)
    setDayJustFinished(true)
  }

  async function handleAddTask({ name, type, priority, note }: { name: string; type: TaskType; priority: Priority; note: string }): Promise<boolean> {
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').insert({
      entry_id: entry.id, user_id: entry.user_id, name, done: false, priority, type, note, position: tasks.length,
    }).select('id').single()
    if (error) {
      toast({ message: t.plan.taskAddFailed, variant: 'error' })
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
      toast({ message: t.plan.apptAddFailed, variant: 'error' })
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
          <h1 className="display text-4xl" style={{ color: 'var(--gold)' }}>{t.plan.dayComplete}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.plan.restUp}</p>
        </div>
        {tomorrowPlanned && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + addDays(entry.date_key, 1) }}>
              {t.plan.seeTomorrow}
            </Button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-7 lg:gap-9 pb-2">
      {/* Bez interneta štikliranje i dalje radi — ovo je jedini znak da nešto čeka.
          Namerno smireno, ne kao greška: korisnik ništa ne treba da uradi. */}
      {pending > 0 && (
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--r-md)] text-sm"
          style={{ background: 'var(--warn-tint)', color: 'var(--warn)' }}
          role="status"
        >
          <span aria-hidden>📴</span>
          <span>{t.plan.offlinePending(pending)}</span>
        </div>
      )}
      {!isToday && (
        <Link href="/history" className="flex items-center gap-1.5 text-sm font-medium -mb-1" style={{ color: 'var(--text-muted)' }}>
          {t.plan.historyBack}
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
          <div className="hidden lg:block mb-2"><span className="section-label">{formatDate(entry.date_key, locale)}</span></div>
          <h1 className="display foil text-3xl lg:text-5xl">
            {isToday ? t.plan.myPlan : t.plan.plan}
          </h1>
          {!isToday && (
            <p className="text-xs font-medium mt-0.5 lg:hidden" style={{ color: 'var(--gold)' }}>
              🌙 {formatDate(entry.date_key, locale)}
            </p>
          )}
          {streak > 0 && (
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-2" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>
              {t.plan.streak(streak)}
            </span>
          )}
        </div>
        <div className="text-right shrink-0 pl-3">
          <p className="display text-5xl lg:text-6xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>
            {doneDisplay}<span className="text-2xl lg:text-3xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
          </p>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase mt-1.5" style={{ color: 'var(--text-muted)' }}>{t.plan.done}</p>
        </div>
      </header>

      {/* Baner kad je dan završen */}
      {dayFinished && (
        <div className="rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3" style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)' }}>
          <span className="text-xl">🌙</span>
          <div className="text-sm">
            <p className="font-medium">{t.plan.todayComplete}</p>
            {tomorrowPlanned && <p className="opacity-70">{t.plan.tomorrowReady}</p>}
          </div>
        </div>
      )}

      {/* Podsetnik: sutra ima zakazanih zadataka iz kalendara */}
      {isToday && tomorrowScheduledCount > 0 && !dayFinished && (
        <div className="rounded-[var(--r-md)] px-4 py-3 flex items-center gap-3" style={{ background: 'var(--surface2)', border: '1px solid var(--hairline)' }}>
          <span className="text-xl shrink-0">📅</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.plan.tomorrowScheduled(tomorrowScheduledCount)}
          </p>
        </div>
      )}

      {/* Upozorenje o rokovima — konkretno, po IMENU (i iz plana i iz kalendara). */}
      {isToday && !dayFinished && dueNow.length > 0 && (
        <div className="rounded-[var(--r-md)] px-4 py-3 flex items-start gap-3" style={{ background: 'var(--danger-tint)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}>
          <span className="text-xl shrink-0">⚠️</span>
          <div className="min-w-0 flex flex-col gap-1">
            {dueNow.map((due, i) => {
              const b = getDeadlineBadge(due.deadline_date, todayKey(tz), locale)
              return (
                <p key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: b.color, fontWeight: 600 }}>{b.text}</span>
                  {' — '}
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{due.name}</span>
                  {due.scheduled && <span className="text-xs">{t.plan.fromCalendar}</span>}
                </p>
              )
            })}
          </div>
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
              {t.plan.emptyPlan}
            </p>
            <Button size="sm" onClick={() => setShowAddTask(true)}>{t.plan.addTask}</Button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="pl-6 pr-5">
              {appts.length > 0 && (
                <div className="py-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
                  {t.plan.appointments}
                </div>
              )}
              {[...appts].sort((a, b) => a.time.localeCompare(b.time)).map((a, idx, arr) => (
                <div key={a.id ?? a.name + a.time}>
                  <AppointmentItem
                    appt={a}
                    currentDate={entry.date_key}
                    onToggle={() => a.id && toggleAppointment(a.id)}
                    onDelete={() => a.id && deleteAppointment(a.id)}
                    onMove={isToday && !dayFinished ? (date, time) => a.id && moveAppointment(a.id, date, time) : undefined}
                  />
                  {idx < arr.length - 1 && <Divider />}
                </div>
              ))}
              {tasks.length > 0 && (
                <>
                  {appts.length > 0 && <Divider />}
                  <div className="py-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
                    {t.plan.tasks}
                  </div>
                </>
              )}
              {sortTasksForDay(tasks, todayKey(tz))
                .map((task, idx, arr) => (
                  <div key={task.id ?? task.name}>
                    <TaskItem
                      task={task}
                      onToggle={() => task.id && toggleTask(task.id)}
                      onDelete={() => task.id && deleteTask(task.id)}
                      onSnooze={isToday && !dayFinished ? (target) => task.id && snoozeTask(task.id, target) : undefined}
                    />
                    {idx < arr.length - 1 && <Divider />}
                  </div>
                ))
              }
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
