'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcBlocks } from '@/lib/energy'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task, Appointment, DayEntry, UserProfile, PlanBlock, TaskType, Priority } from '@/types/ferox'
import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'

function assignTasksToBlocks(tasks: Task[], blocks: ReturnType<typeof calcBlocks>): PlanBlock[] {
  const high   = tasks.filter(t => t.priority === 'high')
  const medium = tasks.filter(t => t.priority === 'medium')
  const low    = tasks.filter(t => t.priority === 'low')

  const distributed: Task[][] = [[], [], [], []]
  ;[...high, ...medium, ...low].forEach((t, i) => {
    distributed[i % 4].push(t)
  })

  return blocks.map((b, i) => ({
    label: b.label,
    badge: b.color,
    badgeText: b.emoji,
    timeRange: b.timeRange,
    tasks: distributed[i],
  }))
}

function TaskItem({
  task, onToggle,
}: { task: Task; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-start gap-3 w-full text-left py-2 group"
    >
      <div
        className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          borderColor: task.done ? 'var(--gold)' : 'var(--border)',
          background: task.done ? 'var(--gold)' : 'transparent',
        }}
      >
        {task.done && <span className="text-white text-xs">✓</span>}
      </div>
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
        className="text-xs px-1.5 py-0.5 rounded shrink-0"
        style={{
          background: task.priority === 'high' ? '#ef444420' : task.priority === 'medium' ? '#f59e0b20' : '#22c55e20',
          color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e',
        }}
      >
        {task.priority === 'high' ? 'V' : task.priority === 'medium' ? 'S' : 'N'}
      </span>
    </button>
  )
}

function AppointmentItem({ appt, onToggle }: { appt: Appointment; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-3 w-full text-left py-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <div
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          borderColor: appt.done ? 'var(--gold)' : 'var(--border)',
          background: appt.done ? 'var(--gold)' : 'transparent',
        }}
      >
        {appt.done && <span className="text-white text-xs">✓</span>}
      </div>
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
  onToggle: (taskName: string) => void
  onToggleAppt: (apptName: string, apptTime: string) => void
}) {
  const doneTasks = block.tasks.filter(t => t.done).length
  const doneAppts = appointments.filter(a => a.done).length
  const done = doneTasks + doneAppts
  const total = block.tasks.length + appointments.length

  if (total === 0) return null

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: block.badge }}>
        <div className="flex items-center gap-2">
          <span>{block.badgeText}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{block.label}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{block.timeRange}</span>
      </div>

      <div className="h-1 w-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: 'var(--gold)' }}
        />
      </div>

      <div className="px-4">
        {appointments.map(a => (
          <AppointmentItem key={a.name + a.time} appt={a} onToggle={() => onToggleAppt(a.name, a.time)} />
        ))}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {block.tasks.map(task => (
            <TaskItem key={task.name} task={task} onToggle={() => onToggle(task.name)} />
          ))}
        </div>
      </div>

      <div className="px-4 py-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{done}/{total} završeno</p>
      </div>
    </div>
  )
}

export default function PlanScreen({
  entry, tasks: initialTasks, appointments, profile,
}: {
  entry: DayEntry
  tasks: Task[]
  appointments: Appointment[]
  profile: UserProfile
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [appts, setAppts] = useState<Appointment[]>(appointments)
  const [savingEod, setSavingEod] = useState(false)
  const [showEod, setShowEod] = useState(false)
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
  const planBlocks = assignTasksToBlocks(tasks, blocks)

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

  async function toggleTask(taskName: string) {
    const supabase = createClient()
    const task = tasks.find(t => t.name === taskName)
    if (!task) return

    const newDone = !task.done
    setTasks(prev => prev.map(t => t.name === taskName ? { ...t, done: newDone } : t))

    await supabase
      .from('tasks')
      .update({ done: newDone })
      .eq('entry_id', entry.id!)
      .eq('name', taskName)
  }

  async function toggleAppointment(name: string, time: string) {
    const appt = appts.find(a => a.name === name && a.time === time)
    if (!appt) return
    const newDone = !appt.done
    setAppts(prev => prev.map(a => a.name === name && a.time === time ? { ...a, done: newDone } : a))
    if (appt.id) {
      const supabase = createClient()
      await supabase.from('appointments').update({ done: newDone }).eq('id', appt.id)
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
    const supabase = createClient()
    // Mark "obrisi" tasks as done, keep "danas" tasks, move "sutra" to tomorrow
    const updatedTasks = tasks.map(t => ({
      ...t,
      done: t.done || replanResult.obrisi.includes(t.name),
    }))
    setTasks(updatedTasks)
    // Sync to DB
    for (const t of updatedTasks) {
      await supabase.from('tasks').update({ done: t.done })
        .eq('entry_id', entry.id!).eq('name', t.name)
    }
    setShowReplan(false)
    setReplanResult(null)
    setReplanText('')
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('day_entries').update({ updated_at: new Date().toISOString() }).eq('id', entry.id!)

    if (user && tasksToTransfer.length > 0) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowKey = tomorrow.toISOString().split('T')[0]
      await supabase.from('transferred_tasks').upsert({
        user_id: user.id,
        tasks: tasksToTransfer.map(t => ({
          name: t.name, priority: t.priority, type: t.type, note: t.note ?? '', done: false,
        })),
        for_date: tomorrowKey,
      }, { onConflict: 'user_id,for_date' })
    }

    const today = new Date().toISOString().split('T')[0]
    document.cookie = `ferox_day_finished=${today}; max-age=86400; path=/`
    setShowEod(true)
    setSavingEod(false)
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
      }
    } else {
      const newTask: Task = { name: newTaskName.trim(), priority: newTaskPriority, type: newTaskType, note: '', done: false }
      const { error } = await supabase.from('tasks').insert({
        entry_id: entry.id,
        user_id: entry.user_id,
        name: newTask.name,
        done: false,
        priority: newTask.priority,
        type: newTask.type,
        note: '',
        position: tasks.length,
      })
      if (!error) {
        setTasks(prev => [...prev, newTask])
        closeAddTask()
      }
    }
    setAddingTask(false)
  }

  function startNewDay() {
    router.push('/?sutra=1')
  }

  if (showTransferPicker) {
    const unfinished = tasks.filter(t => !t.done)
    const toTransfer = unfinished.filter(t => selectedForTransfer.has(t.name))
    return (
      <main className="min-h-dvh flex flex-col p-5 gap-5" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="pt-2">
          <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
            Nedovršeni zadaci
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Izaberi šta da prenesemo za sutra:
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {unfinished.map(task => {
            const checked = selectedForTransfer.has(task.name)
            return (
              <button
                key={task.name}
                onClick={() => toggleTransfer(task.name)}
                className="flex items-center gap-3 p-4 rounded-[14px] text-left transition-all"
                style={{
                  background: checked ? 'rgba(212,116,42,0.10)' : 'var(--surface)',
                  border: `1.5px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                  boxShadow: 'var(--sh1)',
                }}
              >
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: checked ? 'var(--gold)' : 'var(--border)',
                    background: checked ? 'var(--gold)' : 'transparent',
                  }}
                >
                  {checked && <span className="text-white text-xs">✓</span>}
                </div>
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

  if (showEod) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-5 text-center gap-6" style={{ background: 'var(--bg)' }}>
        <div className="text-6xl">{allDone ? '🎉' : '✅'}</div>
        <div>
          <h2 className="text-2xl font-light mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
            {allDone ? 'Fenomenalno!' : 'Dan završen!'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Završio/la si {done} od {total} stavki danas.
          </p>
          {tasks.filter(t => !t.done).length > 0 && (
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              {tasks.filter(t => !t.done).length} nezavršenih zadataka biće preneto sutra.
            </p>
          )}
        </div>
        <Button size="lg" onClick={startNewDay}>
          Planiraj sutra →
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col p-5 gap-5" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
            Moj plan
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {entry.energy} · {entry.sleep_hours}h sna · {initialTasks.length} zadataka za {entry.date_key}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>{done}/{total}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>završeno</p>
        </div>
      </div>

      {/* Ukupni progress */}
      <div className="rounded-full overflow-hidden h-2" style={{ background: 'var(--border)' }}>
        <div
          className="h-full transition-all duration-700 rounded-full"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: 'var(--gold)' }}
        />
      </div>

      {/* Blokovi */}
      <div className="flex flex-col gap-4">
        {planBlocks.map((block, i) => (
          <BlockCard key={block.label} block={block} appointments={getAppointmentsForBlock(i)} onToggle={toggleTask} onToggleAppt={toggleAppointment} />
        ))}
      </div>

      {/* Footer dugmad */}
      <div className="flex flex-col gap-2 pt-2">
        <Button size="lg" className="w-full" onClick={startFinishDay} loading={savingEod}>
          {allDone ? '🎉 Završi dan' : '✅ Završi dan'}
        </Button>
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAddTask(true)}>
          ➕ Dodaj zadatak
        </Button>
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowReplan(true)}>
          🔥 Dan se raspao
        </Button>
        <Button size="sm" variant="ghost" className="w-full" onClick={() => router.push('/')}>
          ✏️ Uredi plan
        </Button>
      </div>

      <div className="flex justify-center pb-4">
        <LogoutButton />
      </div>

      {/* Dodaj zadatak modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) closeAddTask() }}>
          <div className="w-full max-w-[520px] rounded-t-[20px] p-5 flex flex-col gap-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium" style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                {newTaskIsAppt ? 'Novi termin' : 'Novi zadatak'}
              </h3>
              <button onClick={closeAddTask} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Naziv */}
            <input
              autoFocus
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !newTaskIsAppt && addTask()}
              placeholder={newTaskIsAppt ? 'Naziv termina...' : 'Naziv zadatka...'}
              className="w-full h-11 px-3 rounded-[12px] border text-sm outline-none"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />

            {/* Termin toggle */}
            <button
              onClick={() => setNewTaskIsAppt(p => !p)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-[12px] border text-sm"
              style={{
                background: newTaskIsAppt ? 'rgba(212,116,42,0.10)' : 'var(--surface2)',
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
                  className="w-full h-11 px-3 rounded-[12px] border text-sm outline-none"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
                    className="w-full h-10 px-2 rounded-[12px] border text-sm"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
                    className="w-full h-10 px-2 rounded-[12px] border text-sm"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowReplan(false); setReplanResult(null); setReplanText('') } }}>
          <div className="w-full max-w-[520px] rounded-t-[20px] p-5 flex flex-col gap-4"
            style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium" style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                🔥 Dan se raspao
              </h3>
              <button onClick={() => { setShowReplan(false); setReplanResult(null); setReplanText('') }}
                style={{ color: 'var(--text-muted)' }}>✕</button>
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
                  className="w-full p-3 rounded-[12px] border text-sm resize-none outline-none"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <Button size="md" className="w-full" onClick={handleReplan}
                  loading={replanLoading} disabled={!replanText.trim()}>
                  {replanLoading ? 'Replaniram...' : 'Replanira mi dan →'}
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-[12px]" style={{ background: 'rgba(212,116,42,0.08)' }}>
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
