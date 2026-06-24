'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcBlocks } from '@/lib/energy'
import { addDays, tomorrowKey } from '@/lib/date'
import { formatDate } from '@/lib/utils'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task, Appointment, DayEntry, UserProfile, PlanBlock, TaskType, Priority } from '@/types/ferox'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import LogoutButton from '@/components/LogoutButton'
import { useCountUp } from '@/lib/useCountUp'
import DayProgress from '@/components/plan/DayProgress'
import { useToast } from '@/components/ui/Toast'
import { assignTasksToBlocks } from '@/lib/plan'

function TaskItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-start gap-3 w-full text-left py-2.5 transition-transform active:scale-[0.995]">
      <span className="mt-0.5"><Checkbox checked={task.done} /></span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium transition-all duration-200"
          style={{
            color: task.done ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: task.done ? 'line-through' : 'none',
            opacity: task.done ? 0.6 : 1,
          }}
        >
          {task.name}
        </p>
        {task.note && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.note}</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {TASK_TYPE_LABELS[task.type]}
        </p>
      </div>
      <span
        className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 tracking-wide"
        style={{
          background: task.priority === 'high' ? '#ef444418' : task.priority === 'medium' ? '#f59e0b18' : '#22c55e18',
          color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#d97706' : '#16a34a',
        }}
      >
        {task.priority === 'high' ? 'V' : task.priority === 'medium' ? 'S' : 'N'}
      </span>
    </button>
  )
}

function AppointmentItem({ appt, onToggle }: { appt: Appointment; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-3 w-full text-left py-2.5 border-b transition-transform active:scale-[0.995]" style={{ borderColor: 'var(--hairline)' }}>
      <Checkbox checked={appt.done} />
      <span
        className="text-sm font-medium shrink-0 transition-all duration-200"
        style={{ color: appt.done ? 'var(--text-muted)' : 'var(--gold)', opacity: appt.done ? 0.6 : 1 }}
      >
        {appt.time}
      </span>
      <p
        className="text-sm flex-1 truncate transition-all duration-200"
        style={{ color: appt.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: appt.done ? 'line-through' : 'none', opacity: appt.done ? 0.6 : 1 }}
      >
        {appt.name}
      </p>
      <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(212,116,42,0.12)', color: 'var(--gold)' }}>termin</span>
    </button>
  )
}

function BlockCard({
  block, appointments, onToggle, onToggleAppt,
}: {
  block: PlanBlock
  appointments: Appointment[]
  onToggle: (taskId: string) => void
  onToggleAppt: (apptId: string) => void
}) {
  const doneTasks = block.tasks.filter(t => t.done).length
  const doneAppts = appointments.filter(a => a.done).length
  const done = doneTasks + doneAppts
  const total = block.tasks.length + appointments.length

  if (total === 0) return null

  const accent = block.badge.replace('0.15)', '1)')
  const pct = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="card overflow-hidden relative">
      {/* obojena leva accent linija po bloku */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent, opacity: 0.85 }} />
      <div className="flex items-center justify-between pl-5 pr-4 py-3" style={{ background: block.badge }}>
        <div className="flex items-center gap-2 min-w-0">
          <span>{block.badgeText}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{block.label}</span>
          {block.peak && (
            <span className="text-[0.58rem] font-bold tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--gold)', color: '#fff' }}>
              ⚡ VRH DANA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{block.timeRange}</span>
          <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
            {done}/{total}
          </span>
        </div>
      </div>

      {block.rationale && (
        <p className="px-5 pt-2.5 text-xs italic" style={{ color: 'var(--text-muted)' }}>
          {block.rationale}
        </p>
      )}

      <div className="h-1.5 w-full mt-2.5" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }}
        />
      </div>

      <div className="pl-5 pr-4">
        {appointments.map(a => (
          <AppointmentItem key={a.id ?? a.name + a.time} appt={a} onToggle={() => a.id && onToggleAppt(a.id)} />
        ))}
        <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
          {block.tasks.map(task => (
            <TaskItem key={task.id ?? task.name} task={task} onToggle={() => task.id && onToggle(task.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PlanScreen({
  entry, tasks: initialTasks, appointments, profile, dayFinished = false, tomorrowPlanned = false, isToday = true,
}: {
  entry: DayEntry
  tasks: Task[]
  appointments: Appointment[]
  profile: UserProfile
  dayFinished?: boolean
  tomorrowPlanned?: boolean
  isToday?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [appts, setAppts] = useState<Appointment[]>(appointments)
  const [savingEod, setSavingEod] = useState(false)
  const [showTransferPicker, setShowTransferPicker] = useState(false)
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set())
  const [showReplan, setShowReplan] = useState(false)
  const [replanText, setReplanText] = useState('')
  const [replanLoading, setReplanLoading] = useState(false)
  const [replanResult, setReplanResult] = useState<{ poruka: string; danas: string[]; sutra: string[]; obrisi: string[] } | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskType, setNewTaskType] = useState<TaskType>('light')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium')
  const [newTaskIsAppt, setNewTaskIsAppt] = useState(false)
  const [newTaskTime, setNewTaskTime] = useState('09:00')
  const [addingTask, setAddingTask] = useState(false)

  const blocks = calcBlocks(profile.start_time ?? '08:00', profile.sleep_time ?? '23:00', profile.rhythm)
  const planBlocks = assignTasksToBlocks(tasks, blocks, entry.energy_level, profile.rhythm)

  function getAppointmentsForBlock(blockIndex: number): Appointment[] {
    const b = blocks[blockIndex]
    return appts.filter(a => {
      const [h] = a.time.split(':').map(Number)
      return h >= b.start && h < b.end
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

  async function handleReplan() {
    if (!replanText.trim()) return
    setReplanLoading(true)
    const unfinished = tasks.filter(t => !t.done)
    const res = await fetch('/api/ai/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        situation: replanText,
        remainingTasks: unfinished.map(t => t.name),
        energy: entry.energy,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setReplanResult(data)
    }
    setReplanLoading(false)
  }

  async function applyReplan() {
    if (!replanResult) return
    const obrisi = new Set(replanResult.obrisi)
    // "Otpiši" zadatke označavamo kao gotove. Jedan batch update po ID-u.
    const idsToComplete = tasks.filter(t => !t.done && obrisi.has(t.name) && t.id).map(t => t.id!)
    const prevTasks = tasks
    setTasks(prev => prev.map(t => idsToComplete.includes(t.id!) ? { ...t, done: true } : t))
    setShowReplan(false)
    setReplanResult(null)
    setReplanText('')
    if (idsToComplete.length > 0) {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update({ done: true }).in('id', idsToComplete)
      if (error) {
        setTasks(prevTasks)
        toast({ message: 'Replan nije sačuvan — pokušaj ponovo', variant: 'error' })
      }
    }
  }

  function startFinishDay() {
    const unfinished = tasks.filter(t => !t.done)
    if (unfinished.length === 0) {
      finishDay([])
    } else {
      setSelectedForTransfer(new Set(unfinished.map(t => t.name)))
      setShowTransferPicker(true)
    }
  }

  function toggleTransfer(name: string) {
    setSelectedForTransfer(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function finishDay(tasksToTransfer: Task[]) {
    setSavingEod(true)
    setShowTransferPicker(false)

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

    // Danas → početna (EodLanding "vrati se na početnu"); ne-danas → ostani na tom
    // planu (koji sad zna finished_at). Pun reload da server pročita svež finished_at.
    window.location.href = isToday ? '/' : `/plan?date=${entry.date_key}`
  }

  function closeAddTask() {
    setShowAddTask(false)
    setNewTaskName('')
    setNewTaskType('light')
    setNewTaskPriority('medium')
    setNewTaskIsAppt(false)
    setNewTaskTime('09:00')
  }

  async function addTask() {
    if (!newTaskName.trim()) return
    setAddingTask(true)
    const supabase = createClient()

    if (newTaskIsAppt) {
      const { data, error } = await supabase.from('appointments').insert({
        user_id: entry.user_id,
        date_key: entry.date_key,
        name: newTaskName.trim(),
        time: newTaskTime,
        reminder: 15,
        done: false,
      }).select('id').single()

      if (!error) {
        setAppts(prev => [...prev, { id: data?.id, name: newTaskName.trim(), time: newTaskTime, reminder: 15, done: false }])
        closeAddTask()
      } else {
        toast({ message: 'Termin nije dodat — pokušaj ponovo', variant: 'error' })
      }
    } else {
      // .select('id') da novi zadatak odmah nosi id (za pouzdan toggle po ID-u).
      const { data, error } = await supabase.from('tasks').insert({
        entry_id: entry.id,
        user_id: entry.user_id,
        name: newTaskName.trim(),
        done: false,
        priority: newTaskPriority,
        type: newTaskType,
        note: '',
        position: tasks.length,
      }).select('id').single()
      if (!error) {
        const newTask: Task = { id: data?.id, name: newTaskName.trim(), priority: newTaskPriority, type: newTaskType, note: '', done: false }
        setTasks(prev => [...prev, newTask])
        closeAddTask()
      } else {
        toast({ message: 'Zadatak nije dodat — pokušaj ponovo', variant: 'error' })
      }
    }
    setAddingTask(false)
  }

  if (showTransferPicker) {
    const unfinished = tasks.filter(t => !t.done)
    const toTransfer = unfinished.filter(t => selectedForTransfer.has(t.name))
    return (
      <main className="flex flex-col gap-5 pb-2">
        <div className="pt-1">
          <h2 className="display foil text-3xl">
            Nedovršeni zadaci
          </h2>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Izaberi šta da prenesemo za sutra:
          </p>
          <div className="h-px mt-4" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>

        <div className="flex flex-col gap-2">
          {unfinished.map(task => {
            const checked = selectedForTransfer.has(task.name)
            return (
              <button
                key={task.name}
                onClick={() => toggleTransfer(task.name)}
                className="flex items-center gap-3 p-4 rounded-[var(--r-md)] text-left transition-all active:scale-[0.99]"
                style={{
                  background: checked ? 'var(--gold-tint)' : 'var(--surface)',
                  border: `1.5px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                  boxShadow: 'var(--sh-sm)',
                }}
              >
                <Checkbox checked={checked} shape="round" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{task.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {TASK_TYPE_LABELS[task.type]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => finishDay(toTransfer)}
            loading={savingEod}
          >
            {toTransfer.length > 0
              ? `Prenesi ${toTransfer.length} ${toTransfer.length === 1 ? 'zadatak' : 'zadataka'} i završi dan`
              : 'Završi dan bez prenošenja'}
          </Button>
          <button
            onClick={() => setShowTransferPicker(false)}
            className="text-sm text-center py-2"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Nazad na plan
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-5 pb-2">
      {/* Header */}
      <header className="flex items-end justify-between pt-1">
        <div className="min-w-0">
          <h1 className="display foil text-3xl">
            {isToday ? 'Moj plan' : 'Plan'}
          </h1>
          {!isToday && (
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--gold)' }}>
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
          <p className="display text-5xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>
            {doneDisplay}<span className="text-2xl" style={{ color: 'var(--text-muted)' }}>/{total}</span>
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

      {/* Ukupni progress — segmentiran po delovima dana */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DayProgress blocks={planBlocks} />
        </div>
        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
          {total > 0 ? Math.round((done / total) * 100) : 0}%
        </span>
      </div>

      {/* Blokovi */}
      <div className="flex flex-col gap-4">
        {planBlocks.map((block, i) => (
          <BlockCard key={block.label} block={block} appointments={getAppointmentsForBlock(i)} onToggle={toggleTask} onToggleAppt={toggleAppointment} />
        ))}
      </div>

      {/* Footer dugmad */}
      <div className="flex flex-col gap-3 pt-2">
        {/* Primarno: dok dan nije završen → "Završi dan"; kad jeste → povratak na početnu */}
        {!dayFinished && (
          <Button size="lg" className="w-full" onClick={startFinishDay} loading={savingEod}>
            {allDone ? '🎉 Završi dan' : '✅ Završi dan'}
          </Button>
        )}
        {dayFinished && isToday && (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/' }}>
            ← Na početnu
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowAddTask(true)}>
            ➕ Dodaj zadatak
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowReplan(true)}>
            🔥 Dan se raspao
          </Button>
          {isToday ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/?edit=1' }}>
                ✏️ Uredi plan
              </Button>
              {tomorrowPlanned ? (
                <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
                  🌙 Pogledaj sutra
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/?sutra=1' }}>
                  🌙 Planiraj sutra
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="secondary" className="col-span-2" onClick={() => { window.location.href = '/plan' }}>
              ← Nazad na današnji plan
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>

      {/* Dodaj zadatak modal */}
      {showAddTask && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(26,23,20,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeAddTask() }}>
          <div className="modal-panel w-full max-w-[460px] rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] p-5 sm:p-6 flex flex-col gap-4" style={{ background: 'var(--surface)', boxShadow: 'var(--sh-lg)', border: '1px solid var(--hairline)' }}>
            <div className="sm:hidden mx-auto w-10 h-1 rounded-full -mt-1 mb-1" style={{ background: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <h3 className="title-serif text-xl" style={{ color: 'var(--text)' }}>
                {newTaskIsAppt ? 'Novi termin' : 'Novi zadatak'}
              </h3>
              <button onClick={closeAddTask} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Naziv */}
            <input
              autoFocus
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !newTaskIsAppt && addTask()}
              placeholder={newTaskIsAppt ? 'Naziv termina...' : 'Naziv zadatka...'}
              className="field h-12 px-3.5 text-sm"
            />

            {/* Termin toggle */}
            <button
              onClick={() => setNewTaskIsAppt(p => !p)}
              className="flex items-center justify-between w-full px-3.5 py-3 rounded-[var(--r-md)] border text-sm transition-colors"
              style={{
                background: newTaskIsAppt ? 'var(--gold-tint)' : 'var(--surface2)',
                borderColor: newTaskIsAppt ? 'var(--gold)' : 'var(--border)',
              }}
            >
              <span style={{ color: 'var(--text)' }}>🗓️ Zakazan termin</span>
              <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
                style={{ background: newTaskIsAppt ? 'var(--gold)' : 'var(--border)', justifyContent: newTaskIsAppt ? 'flex-end' : 'flex-start' }}>
                <div className="w-4 h-4 rounded-full bg-white" />
              </div>
            </button>

            {newTaskIsAppt ? (
              /* Vreme termina */
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Vreme termina</label>
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={e => setNewTaskTime(e.target.value)}
                  className="field h-12 px-3.5 text-sm"
                />
              </div>
            ) : (
              /* Tip i prioritet zadatka */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tip</label>
                  <select
                    value={newTaskType}
                    onChange={e => setNewTaskType(e.target.value as TaskType)}
                    className="field field-select h-11 px-2 text-sm"
                  >
                    {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as Priority)}
                    className="field field-select h-11 px-2 text-sm"
                  >
                    <option value="high">🔴 Visok</option>
                    <option value="medium">🟡 Srednji</option>
                    <option value="low">🟢 Nizak</option>
                  </select>
                </div>
              </div>
            )}

            <Button size="md" className="w-full" onClick={addTask} loading={addingTask} disabled={!newTaskName.trim()}>
              {newTaskIsAppt ? 'Dodaj termin' : 'Dodaj zadatak'}
            </Button>
          </div>
        </div>
      )}

      {/* Replan modal */}
      {showReplan && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(26,23,20,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowReplan(false); setReplanResult(null); setReplanText('') } }}>
          <div className="modal-panel w-full max-w-[460px] rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] p-5 sm:p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface)', boxShadow: 'var(--sh-lg)', border: '1px solid var(--hairline)' }}>
            <div className="sm:hidden mx-auto w-10 h-1 rounded-full -mt-1 mb-1" style={{ background: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <h3 className="title-serif text-xl" style={{ color: 'var(--text)' }}>
                🔥 Dan se raspao
              </h3>
              <button onClick={() => { setShowReplan(false); setReplanResult(null); setReplanText('') }}
                className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {!replanResult ? (
              <>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Šta se desilo? AI će replanirati tvoj dan.
                </p>
                <textarea
                  value={replanText}
                  onChange={e => setReplanText(e.target.value)}
                  placeholder="Npr: Hitna stvar na poslu, morao/la sam da ostavim sve i rešim problem..."
                  rows={3}
                  className="field p-3.5 text-sm resize-none"
                />
                <Button size="md" className="w-full" onClick={handleReplan}
                  loading={replanLoading} disabled={!replanText.trim()}>
                  {replanLoading ? 'Replaniram...' : 'Replanira mi dan →'}
                </Button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-[var(--r-md)]" style={{ background: 'var(--gold-tint)' }}>
                  <p className="text-sm italic" style={{ color: 'var(--gold)' }}>"{replanResult.poruka}"</p>
                </div>
                {replanResult.danas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>✅ Danas završi:</p>
                    {replanResult.danas.map(t => <p key={t} className="text-sm py-0.5">• {t}</p>)}
                  </div>
                )}
                {replanResult.sutra.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>📅 Sutra:</p>
                    {replanResult.sutra.map(t => <p key={t} className="text-sm py-0.5 opacity-60">• {t}</p>)}
                  </div>
                )}
                {replanResult.obrisi.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>🗑️ Otpiši:</p>
                    {replanResult.obrisi.map(t => <p key={t} className="text-sm py-0.5 line-through opacity-40">• {t}</p>)}
                  </div>
                )}
                <Button size="md" className="w-full" onClick={applyReplan}>
                  Primeni plan ✓
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
