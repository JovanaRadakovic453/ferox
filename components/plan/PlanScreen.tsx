'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcBlocks } from '@/lib/energy'
import { addDays } from '@/lib/date'
import { formatDate } from '@/lib/utils'
import type { Task, Appointment, DayEntry, UserProfile, TaskType, Priority } from '@/types/ferox'
import Button from '@/components/ui/Button'
import { useCountUp } from '@/lib/useCountUp'
import DayProgress from '@/components/plan/DayProgress'
import { useToast } from '@/components/ui/Toast'
import { assignTasksToBlocks } from '@/lib/plan'
import { DEFAULTS } from '@/lib/config'
import BlockCard from '@/components/plan/BlockCard'
import WaterTracker from '@/components/plan/WaterTracker'
import ActionRail from '@/components/plan/ActionRail'
import AddTaskModal from '@/components/plan/AddTaskModal'
import ReplanModal, { type ReplanResult } from '@/components/plan/ReplanModal'

export default function PlanScreen({
  entry, tasks: initialTasks, appointments, profile, dayFinished = false, tomorrowPlanned = false, isToday = true, hasDateParam = false,
}: {
  entry: DayEntry
  tasks: Task[]
  appointments: Appointment[]
  profile: UserProfile
  dayFinished?: boolean
  tomorrowPlanned?: boolean
  isToday?: boolean
  hasDateParam?: boolean
}) {
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [appts, setAppts] = useState<Appointment[]>(appointments)
  const [savingEod, setSavingEod] = useState(false)
  const [dayJustFinished, setDayJustFinished] = useState(false)
  const [showReplan, setShowReplan] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [water, setWater] = useState(entry.water_intake ?? 0)
  const waterGoal = entry.water_goal ?? DEFAULTS.waterGoalMl

  async function addWater(ml: number) {
    const next = Math.max(0, water + ml)
    setWater(next)
    const supabase = createClient()
    const { error } = await supabase.from('day_entries').update({ water_intake: next }).eq('id', entry.id!)
    if (error) { setWater(water); toast({ message: 'Nije sačuvano', variant: 'error' }) }
  }

  const blocks = calcBlocks(profile.start_time ?? '08:00', profile.sleep_time ?? '23:00', profile.rhythm)
  const planBlocks = assignTasksToBlocks(tasks, blocks, entry.energy_level, profile.rhythm)

  function getAppointmentsForBlock(blockIndex: number): Appointment[] {
    const b = blocks[blockIndex]
    const isFirst = blockIndex === 0
    const isLast = blockIndex === blocks.length - 1
    return appts.filter(a => {
      const [h] = a.time.split(':').map(Number)
      // Termin pre prvog bloka → prvi blok. Posle poslednjeg → poslednji blok.
      // Bez ovoga termini van opsega se broje ali ne prikazuju (phantom task u counteru).
      const lower = isFirst ? -Infinity : b.start
      const upper = isLast ? Infinity : b.end
      return h >= lower && h < upper
    })
  }

  const doneTasks = tasks.filter(t => t.done).length
  const doneAppts = appts.filter(a => a.done).length
  const done = doneTasks + doneAppts
  const total = tasks.length + appts.length
  const allDone = done === total && total > 0
  const doneDisplay = useCountUp(done)

  // Optimistički toggle PO ID-u (ne po imenu — dva ista naziva se više ne sudaraju).
  // Na grešku vraćamo stanje i nudimo retry preko toasta.
  async function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newDone = !task.done
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone } : t))

    // Mikro-feedback: vibracija na završetak + proslava kad je sve gotovo.
    if (newDone && profile.micro_feedback !== false) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
      const totalCount = tasks.length + appts.length
      const doneNow = tasks.filter(t => (t.id === taskId ? true : t.done)).length + appts.filter(a => a.done).length
      if (totalCount > 0 && doneNow === totalCount) toast({ message: 'Sve gotovo za danas! 🎉', variant: 'success' })
    }

    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ done: newDone }).eq('id', taskId)
    if (error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !newDone } : t))
      toast({ message: 'Nije sačuvano — proveri internet', variant: 'error', action: { label: 'Pokušaj', onClick: () => toggleTask(taskId) } })
    }
  }

  async function toggleAppointment(apptId: string) {
    const appt = appts.find(a => a.id === apptId)
    if (!appt) return
    const newDone = !appt.done
    setAppts(prev => prev.map(a => a.id === apptId ? { ...a, done: newDone } : a))
    const supabase = createClient()
    const { error } = await supabase.from('appointments').update({ done: newDone }).eq('id', apptId)
    if (error) {
      setAppts(prev => prev.map(a => a.id === apptId ? { ...a, done: !newDone } : a))
      toast({ message: 'Nije sačuvano — proveri internet', variant: 'error', action: { label: 'Pokušaj', onClick: () => toggleAppointment(apptId) } })
    }
  }

  // "Otpiši" zadatke (iz replana) označavamo kao gotove. Jedan batch update po ID-u.
  async function applyReplan(result: ReplanResult) {
    const obrisi = new Set(result.obrisi)
    const idsToComplete = tasks.filter(t => !t.done && obrisi.has(t.name) && t.id).map(t => t.id!)
    if (idsToComplete.length === 0) return
    const prevTasks = tasks
    setTasks(prev => prev.map(t => idsToComplete.includes(t.id!) ? { ...t, done: true } : t))
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ done: true }).in('id', idsToComplete)
    if (error) {
      setTasks(prevTasks)
      toast({ message: 'Replan nije sačuvan — pokušaj ponovo', variant: 'error' })
    }
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

  async function handleAddTask({ name, type, priority }: { name: string; type: TaskType; priority: Priority }): Promise<boolean> {
    // .select('id') da novi zadatak odmah nosi id (za pouzdan toggle po ID-u).
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').insert({
      entry_id: entry.id, user_id: entry.user_id, name, done: false, priority, type, note: '', position: tasks.length,
    }).select('id').single()
    if (error) {
      toast({ message: 'Zadatak nije dodat — pokušaj ponovo', variant: 'error' })
      return false
    }
    setTasks(prev => [...prev, { id: data?.id, name, priority, type, note: '', done: false }])
    return true
  }

  async function handleAddAppointment({ name, time }: { name: string; time: string }): Promise<boolean> {
    const supabase = createClient()
    const { data, error } = await supabase.from('appointments').insert({
      user_id: entry.user_id, date_key: entry.date_key, name, time, reminder: DEFAULTS.reminderMinutes, done: false,
    }).select('id').single()
    if (error) {
      toast({ message: 'Termin nije dodat — pokušaj ponovo', variant: 'error' })
      return false
    }
    setAppts(prev => [...prev, { id: data?.id, name, time, reminder: DEFAULTS.reminderMinutes, done: false }])
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
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" className="w-full" onClick={() => { window.location.href = tomorrowPlanned ? '/plan?date=' + addDays(entry.date_key, 1) : '/?sutra=1' }}>
            🌙 {tomorrowPlanned ? 'Pogledaj plan za sutra →' : 'Isplaniraj sutra →'}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-5 lg:gap-7 pb-2">
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
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
              {entry.energy}
            </span>
            {entry.sleep_hours !== null && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                😴 {entry.sleep_hours}h sna
              </span>
            )}
          </div>
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

      {/* Status traka — progres + voda (jedan red na desktopu) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
        <div className="card p-4 lg:p-5 flex items-center gap-3 lg:flex-1">
          <div className="flex-1">
            <DayProgress blocks={planBlocks} />
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
            {total > 0 ? Math.round((done / total) * 100) : 0}%
          </span>
        </div>

        {/* Voda (samo danas) */}
        {isToday && <WaterTracker water={water} goal={waterGoal} onAdd={addWater} />}
      </div>

      {/* Telo — blokovi (glavna kolona) + akcije (rail na desktopu) */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-7 lg:items-start">
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
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            {planBlocks.map((block, i) => (
              <BlockCard key={block.label} block={block} appointments={getAppointmentsForBlock(i)} onToggle={toggleTask} onToggleAppt={toggleAppointment} />
            ))}
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
          onReplan={() => setShowReplan(true)}
        />
      </div>

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAddTask={handleAddTask}
        onAddAppointment={handleAddAppointment}
      />

      <ReplanModal
        open={showReplan}
        onClose={() => setShowReplan(false)}
        tasks={tasks}
        energy={entry.energy}
        onApply={applyReplan}
      />
    </main>
  )
}
