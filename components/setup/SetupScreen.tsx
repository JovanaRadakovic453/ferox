'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcSleepHours, todayKey } from '@/lib/utils'
import { energyLabel, sleepQuality } from '@/lib/energy'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task, TaskType, Priority, Appointment, UserProfile } from '@/types/ferox'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const ENERGY_OPTIONS = [
  { level: 1, emoji: '🔥', label: 'Pun gas',     desc: 'Spreman/a za sve' },
  { level: 2, emoji: '😊', label: 'Dobro',        desc: 'Solidna energija' },
  { level: 3, emoji: '😐', label: 'Prosečno',     desc: 'Idem kako idem' },
  { level: 4, emoji: '🥱', label: 'Umorno',       desc: 'Teži dan' },
  { level: 5, emoji: '🪫', label: 'Preživljavam', desc: 'Minimalan mod' },
]

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high',   label: '🔴 Visok' },
  { value: 'medium', label: '🟡 Srednji' },
  { value: 'low',    label: '🟢 Nizak' },
]

const TYPE_OPTIONS = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
  value: value as TaskType, label,
}))

const EMPTY_TASK = { name: '', note: '', priority: 'medium' as Priority, type: 'light' as TaskType }
const EMPTY_APPT = { name: '', time: '09:00', reminder: 15 }
const EMPTY_APPT_REMINDER = { value: 15, unit: 'min' as 'min' | 'sat' }

async function fetchBrainDump(text: string): Promise<Task[]> {
  const res = await fetch('/api/ai/brain-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Greška ${res.status}`)
  }
  const { tasks } = await res.json()
  return (tasks ?? []).map((t: Partial<Task>) => ({ ...t, done: false }))
}

export default function SetupScreen({ profile, targetDate, transferredTasks = [] }: { profile: UserProfile; targetDate?: string; transferredTasks?: Task[] }) {
  const router = useRouter()
  const [energy, setEnergy] = useState<number | null>(null)
  const [wakeTime, setWakeTime] = useState(profile.start_time ?? '08:00')
  const [sleepTime, setSleepTime] = useState(profile.last_sleep_time ?? profile.sleep_time ?? '23:00')
  const [tasks, setTasks] = useState<Task[]>(transferredTasks)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [apptForm, setApptForm] = useState(EMPTY_APPT)
  const [reminderInput, setReminderInput] = useState(EMPTY_APPT_REMINDER)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showApptForm, setShowApptForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [brainDumpText, setBrainDumpText] = useState('')
  const [showBrainDump, setShowBrainDump] = useState(false)
  const [brainDumpLoading, setBrainDumpLoading] = useState(false)
  const [brainDumpError, setBrainDumpError] = useState<string | null>(null)

  const sleepHours = calcSleepHours(sleepTime, wakeTime)

  async function handleBrainDump() {
    if (!brainDumpText.trim()) return
    setBrainDumpLoading(true)
    setBrainDumpError(null)
    try {
      const extracted = await fetchBrainDump(brainDumpText)
      setTasks(prev => [...prev, ...extracted])
      setBrainDumpText('')
      setShowBrainDump(false)
    } catch (err) {
      setBrainDumpError(err instanceof Error ? err.message : 'Nepoznata greška')
    } finally {
      setBrainDumpLoading(false)
    }
  }

  function addTask() {
    if (!taskForm.name.trim()) return
    setTasks(prev => [...prev, { ...taskForm, done: false }])
    setTaskForm(EMPTY_TASK)
    setShowTaskForm(false)
  }

  function addAppointment() {
    if (!apptForm.name.trim()) return
    const reminderMinutes = reminderInput.unit === 'sat'
      ? (reminderInput.value || 0) * 60
      : (reminderInput.value || 0)
    setAppointments(prev => [...prev, { ...apptForm, reminder: reminderMinutes, done: false }])
    setApptForm(EMPTY_APPT)
    setReminderInput(EMPTY_APPT_REMINDER)
    setShowApptForm(false)
  }

  async function handleSubmit() {
    if (!energy || tasks.length === 0) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dateKey = targetDate ?? todayKey()

    const { data: entry, error: entryError } = await supabase
      .from('day_entries')
      .upsert({
        user_id: user.id,
        date_key: dateKey,
        energy: energyLabel(energy),
        sleep_hours: sleepHours,
        water_intake: 0,
        water_goal: 2000,
      }, { onConflict: 'user_id,date_key' })
      .select('id')
      .single()

    if (entryError || !entry) { setLoading(false); return }

    await supabase.from('tasks').delete().eq('entry_id', entry.id)
    await supabase.from('tasks').insert(
      tasks.map((t, i) => ({
        entry_id: entry.id,
        user_id: user.id,
        name: t.name,
        done: false,
        priority: t.priority,
        type: t.type,
        note: t.note,
        position: i,
      }))
    )

    // Uvek obrisi stare termine za taj dan pa sačuvaj nove
    await supabase.from('appointments').delete()
      .eq('user_id', user.id).eq('date_key', dateKey)
    if (appointments.length > 0) {
      await supabase.from('appointments').insert(
        appointments.map(a => ({
          user_id: user.id,
          date_key: dateKey,
          name: a.name,
          time: a.time,
          reminder: a.reminder,
          done: false,
        }))
      )
    }

    await supabase.from('profiles').update({
      last_sleep_time: sleepTime,
      last_sleep_hours: sleepHours,
      start_time: wakeTime,
    }).eq('id', user.id)

    router.push('/plan')
    router.refresh()
  }

  const canSubmit = energy !== null && tasks.length > 0

  return (
    <main className="min-h-dvh flex flex-col p-5 gap-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="pt-2">
        <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>Ferox</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {targetDate && targetDate !== todayKey()
            ? `Planiramo sutra, ${profile.name} 🌙`
            : `Kako počinjemo danas, ${profile.name}?`}
        </p>
      </div>

      {/* Baner za prenete zadatke */}
      {transferredTasks.length > 0 && (
        <div className="rounded-[12px] px-4 py-3 text-sm" style={{ background: 'rgba(212,116,42,0.10)', color: 'var(--gold)' }}>
          📋 {transferredTasks.length} {transferredTasks.length === 1 ? 'zadatak preneto' : 'zadataka preneto'} iz prethodnog dana
        </div>
      )}

      {/* Spavanje */}
      <section className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
        <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>😴 SPAVANJE</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input id="sleep" label="Legao/la sinoć" type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
          <Input id="wake"  label="Probudio/la se" type="time" value={wakeTime}  onChange={e => setWakeTime(e.target.value)} />
        </div>
        {sleepHours > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sleepHours}h sna · {sleepQuality(sleepHours)}</p>
        )}
      </section>

      {/* Energija */}
      <section className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
        <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>⚡ ENERGIJA DANAS</h2>
        <div className="flex flex-col gap-2">
          {ENERGY_OPTIONS.map(opt => (
            <button key={opt.level} type="button" onClick={() => setEnergy(opt.level)}
              className="flex items-center gap-3 p-3 rounded-[12px] border text-left transition-all duration-200"
              style={{
                background: energy === opt.level ? 'var(--gold)' : 'var(--surface2)',
                borderColor: energy === opt.level ? 'var(--gold)' : 'transparent',
                color: energy === opt.level ? '#fff' : 'var(--text)',
              }}>
              <span className="text-xl">{opt.emoji}</span>
              <div>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Termini */}
      <section className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>🗓️ ZAKAZANI TERMINI</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>{appointments.length}</span>
        </div>

        {appointments.length > 0 && (
          <div className="flex flex-col gap-2">
            {appointments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-[10px]" style={{ background: 'var(--surface2)' }}>
                <span className="text-sm font-medium shrink-0" style={{ color: 'var(--gold)' }}>{a.time}</span>
                <p className="text-sm flex-1 truncate">{a.name}</p>
                <button onClick={() => setAppointments(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs opacity-50 hover:opacity-100 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {showApptForm ? (
          <div className="flex flex-col gap-3 p-3 rounded-[12px] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
            <Input id="appt-name" placeholder="Naziv termina" value={apptForm.name}
              onChange={e => setApptForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <Input id="appt-time" label="Vreme" type="time" value={apptForm.time}
                onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))} />
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Podsetnik pre</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={reminderInput.value}
                    onChange={e => setReminderInput(r => ({ ...r, value: Math.max(0, Number(e.target.value)) }))}
                    className="w-full h-11 px-2 rounded-[12px] text-sm border text-center"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <select
                    value={reminderInput.unit}
                    onChange={e => setReminderInput(r => ({ ...r, unit: e.target.value as 'min' | 'sat' }))}
                    className="h-11 px-2 rounded-[12px] text-sm border shrink-0"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="min">min</option>
                    <option value="sat">sat</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addAppointment} disabled={!apptForm.name.trim()} className="flex-1">Dodaj</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowApptForm(false); setApptForm(EMPTY_APPT); setReminderInput(EMPTY_APPT_REMINDER) }}>Otkaži</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowApptForm(true)}
            className="flex items-center gap-2 p-3 rounded-[12px] border-2 border-dashed text-sm w-full"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span className="text-lg">+</span> Dodaj termin
          </button>
        )}
      </section>

      {/* Brain Dump */}
      <section className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>✨ BRAIN DUMP</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,116,42,0.12)', color: 'var(--gold)' }}>AI</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Napiši sve što ti je na umu — AI će izvući zadatke automatski
        </p>
        {showBrainDump ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={brainDumpText}
              onChange={e => setBrainDumpText(e.target.value)}
              placeholder="Npr: Danas moram da završim prezentaciju za klijenta, zakažem zubarku, odgovorim na mejlove i kupim namirnice..."
              rows={4}
              autoFocus
              className="w-full p-3 rounded-[12px] border text-sm resize-none outline-none transition-all"
              style={{
                background: 'var(--surface2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
            {brainDumpError && (
              <p className="text-xs px-1" style={{ color: '#c0392b' }}>Greška: {brainDumpError}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBrainDump} loading={brainDumpLoading}
                disabled={!brainDumpText.trim()} className="flex-1">
                {brainDumpLoading ? 'Analiziram...' : '✨ Izvuci zadatke'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowBrainDump(false); setBrainDumpText(''); setBrainDumpError(null) }}>
                Otkaži
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowBrainDump(true)}
            className="flex items-center gap-2 p-3 rounded-[12px] border-2 border-dashed text-sm w-full"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span>✨</span> Piši slobodno, AI izvlači zadatke
          </button>
        )}
      </section>

      {/* Zadaci */}
      <section className="rounded-[16px] p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>📋 ZADACI ZA DANAS</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>{tasks.length}</span>
        </div>

        {tasks.length > 0 && (
          <div className="flex flex-col gap-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-[10px]" style={{ background: 'var(--surface2)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {PRIORITY_OPTIONS.find(p => p.value === t.priority)?.label} · {TASK_TYPE_LABELS[t.type]}
                  </p>
                </div>
                <button onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs shrink-0 px-1.5 py-0.5 rounded opacity-50 hover:opacity-100"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {showTaskForm ? (
          <div className="flex flex-col gap-3 p-3 rounded-[12px] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
            <Input id="task-name" placeholder="Naziv zadatka" value={taskForm.name}
              onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <Input id="task-note" placeholder="Napomena (opciono)" value={taskForm.note}
              onChange={e => setTaskForm(f => ({ ...f, note: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
                <select value={taskForm.priority}
                  onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  className="w-full h-9 px-2 rounded-[10px] text-sm border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tip</label>
                <select value={taskForm.type}
                  onChange={e => setTaskForm(f => ({ ...f, type: e.target.value as TaskType }))}
                  className="w-full h-9 px-2 rounded-[10px] text-sm border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addTask} disabled={!taskForm.name.trim()} className="flex-1">Dodaj</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowTaskForm(false); setTaskForm(EMPTY_TASK) }}>Otkaži</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-2 p-3 rounded-[12px] border-2 border-dashed text-sm w-full"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span className="text-lg">+</span> Dodaj zadatak
          </button>
        )}
      </section>

      <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={handleSubmit}>
        Napravi moj plan →
      </Button>

      {!canSubmit && (
        <p className="text-center text-xs -mt-3" style={{ color: 'var(--text-muted)' }}>
          {!energy ? 'Izaberi nivo energije' : 'Dodaj bar jedan zadatak'}
        </p>
      )}
      <div className="h-4" />
    </main>
  )
}
