'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcSleepHours, todayKey, formatDate } from '@/lib/utils'
import { energyLabel, sleepQuality } from '@/lib/energy'
import { TASK_TYPE_LABELS } from '@/types/ferox'
import type { Task, TaskType, Priority, Appointment, UserProfile } from '@/types/ferox'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const ENERGY_OPTIONS = [
  { level: 1, emoji: '🔥', label: 'Pun gas',     desc: 'Spreman/a za sve', tint: 'rgba(212,116,42,0.18)' },
  { level: 2, emoji: '😊', label: 'Dobro',        desc: 'Solidna energija', tint: 'rgba(190,120,45,0.15)' },
  { level: 3, emoji: '😐', label: 'Prosečno',     desc: 'Idem kako idem',   tint: 'rgba(150,125,80,0.15)' },
  { level: 4, emoji: '🥱', label: 'Umorno',       desc: 'Teži dan',         tint: 'rgba(105,110,125,0.15)' },
  { level: 5, emoji: '🪫', label: 'Preživljavam', desc: 'Minimalan mod',    tint: 'rgba(90,100,120,0.16)' },
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
    throw new Error(body.error?.message ?? body.error ?? `Greška ${res.status}`)
  }
  const { tasks } = await res.json()
  return (tasks ?? []).map((t: Partial<Task>) => ({
    ...t,
    done: false,
    note: t.note ?? '',
    priority: t.priority ?? 'medium',
    type: t.type ?? 'light',
  }))
}

/** Tidy section header: tinted icon chip + tracked uppercase label + optional trailing slot. */
function SectionHeader({ icon, title, trailing }: { icon: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-8 h-8 rounded-[10px] text-base shrink-0" style={{ background: 'var(--surface2)' }}>
          {icon}
        </span>
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  )
}

/** Signal-strength style energy meter (more bars = more energy). */
function EnergyMeter({ strength, active }: { strength: number; active: boolean }) {
  return (
    <span className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden>
      {[1, 2, 3, 4, 5].map(b => (
        <span
          key={b}
          className="w-[3.5px] rounded-full transition-all duration-300"
          style={{
            height: `${7 + b * 3}px`,
            background: b <= strength
              ? (active ? 'rgba(255,255,255,0.95)' : 'var(--gold)')
              : (active ? 'rgba(255,255,255,0.32)' : 'var(--border)'),
          }}
        />
      ))}
    </span>
  )
}

function CountChip({ n }: { n: number }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
      {n}
    </span>
  )
}

export default function SetupScreen({ profile, targetDate, transferredTasks = [], initialEnergy = null, showTransferBanner = false }: { profile: UserProfile; targetDate?: string; transferredTasks?: Task[]; initialEnergy?: number | null; showTransferBanner?: boolean }) {
  const router = useRouter()
  // Pri ponovnom otvaranju plana (edit) vraćamo izabranu energiju da dugme
  // "Napravi plan" ne ostane bezrazložno disabled.
  const [energy, setEnergy] = useState<number | null>(initialEnergy)
  const [wakeTime, setWakeTime] = useState(profile.start_time ?? '08:00')
  const [sleepTime, setSleepTime] = useState(profile.last_sleep_time ?? profile.sleep_time ?? '23:00')
  // showTransferBanner=true → tasks su iz transferred_tasks (opt-in), ne pre-učitavaj ih automatski
  // showTransferBanner=false → tasks su iz postojećeg day_entry (edit mode), pre-učitaj ih
  const [tasks, setTasks] = useState<Task[]>(showTransferBanner ? [] : transferredTasks)
  const [suggestedTransfers, setSuggestedTransfers] = useState<Task[]>(showTransferBanner ? transferredTasks : [])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [apptForm, setApptForm] = useState(EMPTY_APPT)
  const [reminderInput, setReminderInput] = useState(EMPTY_APPT_REMINDER)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showApptForm, setShowApptForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [brainDumpText, setBrainDumpText] = useState('')
  const [showBrainDump, setShowBrainDump] = useState(false)
  const [brainDumpLoading, setBrainDumpLoading] = useState(false)
  const [brainDumpError, setBrainDumpError] = useState<string | null>(null)
  const [brainDumpSuccess, setBrainDumpSuccess] = useState<number | null>(null)
  const isSutraMode = targetDate !== undefined && targetDate !== todayKey()
  const sleepHours = calcSleepHours(sleepTime, wakeTime)

  async function handleBrainDump() {
    if (!brainDumpText.trim()) return
    setBrainDumpLoading(true)
    setBrainDumpError(null)
    try {
      const extracted = await fetchBrainDump(brainDumpText)
      if (extracted.length === 0) {
        setBrainDumpError('AI nije pronašao zadatke. Pokušaj opisati konkretnije, npr: "Moram da kupim mleko, nazovem Marka, završim izveštaj"')
        return
      }
      setTasks(prev => [...prev, ...extracted])
      setBrainDumpText('')
      setShowBrainDump(false)
      setBrainDumpSuccess(extracted.length)
      setTimeout(() => setBrainDumpSuccess(null), 3000)
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
    if (!energy || tasks.length === 0) return
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

  const canSubmit = energy !== null && tasks.length > 0 && !brainDumpLoading

  // Pozdrav prema dobu dana (klijentski; samo za UI ton).
  const hour = new Date().getHours()
  const dayPart = hour < 5 ? 'Dobro veče' : hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče'
  const heroTitle = isSutraMode ? 'Planiramo sutra' : dayPart
  const heroSub = isSutraMode
    ? 'Pripremi sutrašnji dan na miru — zakaži ga dok je sveže. 🌙'
    : 'Oblikujmo dan prema energiji koju zaista imaš.'
  const taskWord = tasks.length === 1 ? 'zadatak' : 'zadataka'

  return (
    <>
      <main className="flex flex-col gap-7 stagger pb-44">
        {/* Hero */}
        <header className="flex flex-col gap-5 pt-2">
          <div className="flex items-center justify-between">
            <span className="display foil text-2xl tracking-[0.06em]">Ferox</span>
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--text-muted)', boxShadow: 'var(--sh-xs)' }}
            >
              {formatDate(targetDate ?? todayKey())}
            </span>
          </div>
          <div>
            <h1 className="title-serif text-[2.15rem] leading-[1.08]" style={{ color: 'var(--text)' }}>
              {heroTitle},<br />
              <span className="foil">{profile.name}</span>
            </h1>
            <p className="text-sm mt-3 max-w-[36ch]" style={{ color: 'var(--text-muted)' }}>
              {heroSub}
            </p>
          </div>
        </header>

        {/* Predloženi zadaci iz prethodnog dana (opt-in) */}
        {suggestedTransfers.length > 0 && (
          <section className="card p-7 flex flex-col gap-6">
            <SectionHeader
              icon="📋"
              title="Iz prethodnog dana"
              trailing={
                <button
                  onClick={() => {
                    setTasks(prev => [...prev, ...suggestedTransfers])
                    setSuggestedTransfers([])
                  }}
                  className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--gold)' }}
                >
                  Dodaj sve
                </button>
              }
            />
            <div className="flex flex-col gap-2.5">
              {suggestedTransfers.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
                    background: t.priority === 'high' ? '#ef444418' : t.priority === 'medium' ? '#f59e0b18' : '#22c55e18',
                    color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#d97706' : '#16a34a',
                  }}>
                    {t.priority === 'high' ? 'V' : t.priority === 'medium' ? 'S' : 'N'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TASK_TYPE_LABELS[t.type]}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTasks(prev => [...prev, t])
                      setSuggestedTransfers(prev => prev.filter((_, idx) => idx !== i))
                    }}
                    className="text-xs font-semibold shrink-0 px-2.5 py-1.5 rounded-[10px] transition-all hover:brightness-95"
                    style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}
                  >
                    + Dodaj
                  </button>
                  <button
                    onClick={() => setSuggestedTransfers(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Spavanje — prvo */}
        <section className="card p-7 flex flex-col gap-6">
          <SectionHeader icon="😴" title="Kako si spavao/la?" />
          <div className="grid grid-cols-2 gap-3.5">
            <Input id="sleep" label="🌙 Naveče" type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
            <Input id="wake"  label="☀️ Ujutru" type="time" value={wakeTime}  onChange={e => setWakeTime(e.target.value)} />
          </div>
          {sleepHours > 0 && (
            <div className="flex items-center gap-3 rounded-[var(--r-md)] px-4 py-3.5" style={{ background: 'var(--gold-tint)' }}>
              <span className="text-xl">💤</span>
              <p className="text-sm">
                <span className="font-semibold" style={{ color: 'var(--gold)' }}>{sleepHours}h sna</span>
                <span style={{ color: 'var(--text-muted)' }}> · {sleepQuality(sleepHours)}</span>
              </p>
            </div>
          )}
        </section>

        {/* Energija — signature */}
        <section className="card p-7 flex flex-col gap-6">
          <SectionHeader icon="⚡" title="Kako se osećaš danas?" />
          <div className="flex flex-col gap-3">
            {ENERGY_OPTIONS.map(opt => {
              const active = energy === opt.level
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => setEnergy(opt.level)}
                  className="flex items-center gap-4 p-4 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{
                    borderRadius: 'var(--r-md)',
                    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                    // longhand only — mixing `background` shorthand with `backgroundImage`
                    // makes React wipe the gradient on toggle (pale selected state).
                    backgroundColor: active ? 'transparent' : 'var(--surface2)',
                    backgroundImage: active ? 'linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%)' : 'none',
                    color: active ? '#fff' : 'var(--text)',
                    boxShadow: active ? 'var(--sh-gold), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                    textShadow: active ? '0 1px 3px rgba(70,30,2,0.55)' : undefined,
                    transform: active ? 'translateY(-2px)' : undefined,
                  }}
                >
                  <span
                    className="grid place-items-center w-12 h-12 rounded-full text-2xl shrink-0"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.22)' : opt.tint,
                      boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.4)' : 'inset 0 0 0 1px var(--hairline)',
                    }}
                  >
                    {opt.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[0.97rem] leading-tight">{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ opacity: active ? 0.92 : 0.62 }}>{opt.desc}</div>
                  </div>
                  <EnergyMeter strength={6 - opt.level} active={active} />
                </button>
              )
            })}
          </div>
        </section>

        {/* Brain Dump — AI */}
        <section
          className="card p-7 flex flex-col gap-6"
          style={{ backgroundImage: 'linear-gradient(180deg, var(--gold-tint), transparent 55%)' }}
        >
          <SectionHeader
            icon="✨"
            title="Brain dump"
            trailing={
              <span className="text-[0.65rem] font-bold tracking-wide px-2.5 py-1 rounded-full" style={{ background: 'var(--gold)', color: '#fff', boxShadow: 'var(--sh-gold)' }}>
                AI
              </span>
            }
          />
          {brainDumpSuccess !== null && (
            <div className="rounded-[var(--r-md)] px-4 py-2.5 text-sm" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
              ✓ {brainDumpSuccess} {brainDumpSuccess === 1 ? 'zadatak dodat' : 'zadataka dodato'} u listu ispod
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Napiši sve što ti je na umu — AI će izvući zadatke automatski.
          </p>
          {showBrainDump ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={brainDumpText}
                onChange={e => setBrainDumpText(e.target.value)}
                placeholder="Npr: Danas moram da završim prezentaciju za klijenta, zakažem zubarku, odgovorim na mejlove i kupim namirnice..."
                rows={4}
                autoFocus
                className="field p-3.5 text-sm resize-none"
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
              className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed text-sm w-full transition-colors"
              style={{ borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))', color: 'var(--gold)' }}>
              <span>✨</span> Piši slobodno, AI izvlači zadatke
            </button>
          )}
        </section>

        {/* Zadaci */}
        <section className="card p-7 flex flex-col gap-6">
          <SectionHeader icon="📋" title="Zadaci za danas" trailing={<CountChip n={tasks.length} />} />

          {tasks.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
                    background: t.priority === 'high' ? '#ef444418' : t.priority === 'medium' ? '#f59e0b18' : '#22c55e18',
                    color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#d97706' : '#16a34a',
                  }}>
                    {t.priority === 'high' ? 'V' : t.priority === 'medium' ? 'S' : 'N'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TASK_TYPE_LABELS[t.type]}</p>
                  </div>
                  <button onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {showTaskForm ? (
            <div className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
              <Input id="task-name" placeholder="Naziv zadatka" value={taskForm.name}
                onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && taskForm.name.trim()) addTask() }}
                autoFocus />
              <Input id="task-note" placeholder="Napomena (opciono)" value={taskForm.note}
                onChange={e => setTaskForm(f => ({ ...f, note: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
                  <select value={taskForm.priority}
                    onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="field field-select h-11 px-3 text-sm">
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Tip</label>
                  <select value={taskForm.type}
                    onChange={e => setTaskForm(f => ({ ...f, type: e.target.value as TaskType }))}
                    className="field field-select h-11 px-3 text-sm">
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
              className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed border-[var(--border)] text-sm w-full text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
              <span className="text-lg">+</span> Dodaj zadatak
            </button>
          )}
        </section>

        {/* Termini */}
        <section className="card p-7 flex flex-col gap-6">
          <SectionHeader icon="🗓️" title="Zakazani termini" trailing={<CountChip n={appointments.length} />} />

          {appointments.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {appointments.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
                  <span className="text-sm font-semibold shrink-0 tabular-nums" style={{ color: 'var(--gold)' }}>{a.time}</span>
                  <p className="text-sm flex-1 truncate">{a.name}</p>
                  <button onClick={() => setAppointments(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs opacity-50 hover:opacity-100 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {showApptForm ? (
            <div className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
              <Input id="appt-name" placeholder="Naziv termina" value={apptForm.name}
                onChange={e => setApptForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input id="appt-time" label="Vreme" type="time" value={apptForm.time}
                  onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))} />
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Podsetnik pre</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={reminderInput.value}
                      onChange={e => setReminderInput(r => ({ ...r, value: Math.max(0, Number(e.target.value)) }))}
                      className="field h-11 px-2 text-sm text-center"
                    />
                    <select
                      value={reminderInput.unit}
                      onChange={e => setReminderInput(r => ({ ...r, unit: e.target.value as 'min' | 'sat' }))}
                      className="field field-select h-11 px-2 text-sm shrink-0 w-auto"
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
              className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed border-[var(--border)] text-sm w-full text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
              <span className="text-lg">+</span> Dodaj termin
            </button>
          )}
        </section>

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
      </main>

      {/* Sticky frosted CTA — uvek nadohvat palca */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[540px] z-40">
        <div className="glass px-5 min-[540px]:px-9 pt-3.5 pb-safe" style={{ borderTop: '1px solid var(--hairline)' }}>
          <Button size="lg" className="w-full" disabled={!canSubmit} loading={loading} onClick={handleSubmit}>
            {tasks.length > 0 ? `Napravi plan · ${tasks.length} ${taskWord} →` : 'Napravi moj plan →'}
          </Button>
          {!canSubmit && !loading && (
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {!energy ? '⚡ Izaberi nivo energije' : '📋 Dodaj bar jedan zadatak'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
