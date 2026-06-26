'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import type { UserProfile, Reason, Rhythm } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'

const REASONS: { value: Reason; label: string }[] = [
  { value: 'work', label: '💼 Posao' },
  { value: 'school', label: '🎓 Škola' },
  { value: 'personal', label: '🌱 Lično' },
  { value: 'all', label: '✨ Sve' },
]
const RHYTHMS: { value: Rhythm; label: string }[] = [
  { value: 'morning', label: '🌅 Jutarnji' },
  { value: 'midday', label: '☀️ Podnevni' },
  { value: 'evening', label: '🌙 Večernji' },
  { value: 'mixed', label: '🌊 Mešovito' },
]
const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
const HABITS_BY_REASON: Record<Reason, string[]> = {
  work:     ['Administracija', 'Sastanak', 'Kreativni rad', 'Istraživački rad', 'Komunikacija', 'Lagano', 'Planiranje', 'Pauza', 'Sport'],
  school:   ['Učenje', 'Ponavljanje', 'Pisanje', 'Komunikacija', 'Kreativni rad', 'Lagano', 'Planiranje', 'Čitanje', 'Pauza', 'Sport'],
  personal: ['Meditacija', 'Sport', 'Čitanje', 'Planiranje', 'Kreativni rad', 'Šetnja', 'Pisanje', 'Učenje', 'Rad na sebi'],
  all:      ['Planiranje', 'Kreativni rad', 'Čitanje', 'Meditacija', 'Sport', 'Šetnja', 'Učenje', 'Pisanje', 'Pauza', 'Dnevnik', 'Komunikacija', 'Lagano'],
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-2 rounded-[var(--r-md)] transition-colors"
      style={{
        background: active ? 'var(--gold-tint)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
        color: active ? 'var(--gold)' : 'var(--text-muted)',
      }}
    >
      {children}
    </button>
  )
}

export default function SettingsForm({ profile, email }: { profile: UserProfile; email: string }) {
  const router = useRouter()
  const toast = useToast()

  const [name, setName] = useState(profile.name ?? '')
  const [reason, setReason] = useState<Reason>(profile.reason ?? 'all')
  const [rhythm, setRhythm] = useState<Rhythm>(profile.rhythm ?? 'mixed')
  const [sleepTime, setSleepTime] = useState(profile.sleep_time ?? '23:00')
  const [startTime, setStartTime] = useState(profile.start_time ?? '08:00')
  const [restDays, setRestDays] = useState<number[]>(profile.rest_days ?? [0, 6])
  const [morning, setMorning] = useState<string[]>(profile.morning_tasks ?? [])
  const [evening, setEvening] = useState<string[]>(profile.evening_tasks ?? [])
  const [microFeedback, setMicroFeedback] = useState(profile.micro_feedback ?? true)
  const [soundEnabled, setSoundEnabled] = useState(profile.sound_enabled ?? false)
  const [pomodoro, setPomodoro] = useState(profile.pomodoro_minutes ?? DEFAULTS.pomodoroMinutes)
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      reason,
      rhythm,
      sleep_time: sleepTime,
      start_time: startTime,
      rest_days: restDays,
      morning_tasks: morning,
      evening_tasks: evening,
      micro_feedback: microFeedback,
      sound_enabled: soundEnabled,
      pomodoro_minutes: Math.min(DEFAULTS.pomodoroMax, Math.max(DEFAULTS.pomodoroMin, pomodoro)),
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    setSaving(false)
    if (error) toast({ message: 'Nije sačuvano — pokušaj ponovo', variant: 'error' })
    else { toast({ message: 'Sačuvano ✓', variant: 'success' }); router.refresh() }
  }

  async function persistTheme(theme: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ theme }).eq('id', profile.id)
  }

  async function changePassword() {
    if (newPassword.length < 6) { toast({ message: 'Lozinka mora imati bar 6 karaktera', variant: 'error' }); return }
    setChangingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPw(false)
    if (error) toast({ message: error.message, variant: 'error' })
    else { setNewPassword(''); toast({ message: 'Lozinka promenjena ✓', variant: 'success' }) }
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'POST' })
    if (res.ok) {
      window.location.href = '/login'
    } else {
      const body = await res.json().catch(() => ({}))
      toast({ message: body.error?.message ?? 'Brisanje nije uspelo', variant: 'error' })
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <main className="flex flex-col gap-5 lg:gap-6 pb-2 lg:max-w-5xl lg:mx-auto lg:w-full">
      <header className="pt-2">
        <div className="hidden lg:block mb-2"><span className="section-label">Tvoj nalog</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">Podešavanja</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>{email}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      {/* Profil */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Profil</p>
        <Input id="name" label="Ime" value={name} onChange={e => setName(e.target.value)} />
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Zašto koristiš Ferox</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(r => <Chip key={r.value} active={reason === r.value} onClick={() => setReason(r.value)}>{r.label}</Chip>)}
          </div>
        </div>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Kad si najproduktivniji/a</label>
          <div className="flex flex-wrap gap-2">
            {RHYTHMS.map(r => <Chip key={r.value} active={rhythm === r.value} onClick={() => setRhythm(r.value)}>{r.label}</Chip>)}
          </div>
        </div>
      </section>

      {/* Ritam dana */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Ritam dana</p>
        <div className="grid grid-cols-2 gap-3">
          <Input id="start" label="☀️ Buđenje" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          <Input id="sleep" label="🌙 Spavanje" type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Slobodni dani (ne lome streak)</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => <Chip key={i} active={restDays.includes(i)} onClick={() => toggle(restDays, i, setRestDays)}>{d}</Chip>)}
          </div>
        </div>
      </section>

      {/* Navike */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Navike</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>🌅 Jutarnje</label>
          <div className="flex flex-wrap gap-2">
            {HABITS_BY_REASON[reason].map(h => <Chip key={h} active={morning.includes(h)} onClick={() => toggle(morning, h, setMorning)}>{h}</Chip>)}
          </div>
        </div>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>🌙 Večernje</label>
          <div className="flex flex-wrap gap-2">
            {HABITS_BY_REASON[reason].map(h => <Chip key={h} active={evening.includes(h)} onClick={() => toggle(evening, h, setEvening)}>{h}</Chip>)}
          </div>
        </div>
      </section>

      {/* Aplikacija */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Aplikacija</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Tema</label>
          <ThemeToggle onChange={persistTheme} />
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm">Mikro-animacije pri završetku</span>
          <input type="checkbox" checked={microFeedback} onChange={e => setMicroFeedback(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm">Zvuk</span>
          <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
        </label>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Input id="pomo" label="Pomodoro (min)" type="number" value={String(pomodoro)} onChange={e => setPomodoro(Number(e.target.value) || DEFAULTS.pomodoroMinutes)} />
        </div>
        <div className="rounded-[var(--r-md)] px-3.5 py-3 text-xs" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
          🔔 Podsetnici (push notifikacije) — uskoro
        </div>
      </section>
      </div>

      <div className="lg:flex lg:justify-center">
        <Button size="lg" className="w-full lg:w-auto lg:px-20" onClick={save} loading={saving}>Sačuvaj izmene</Button>
      </div>

      {/* Nalog */}
      <section className="card p-5 lg:p-6 flex flex-col gap-4">
        <p className="section-label">Nalog</p>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-2">
            <Input id="pw" label="Nova lozinka" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Bar 6 karaktera" />
            <Button size="sm" variant="secondary" onClick={changePassword} loading={changingPw} disabled={!newPassword}>Promeni lozinku</Button>
          </div>
          <div className="flex flex-col gap-3">
            <a href="/api/account/export" className="text-sm font-medium" style={{ color: 'var(--gold)' }}>⬇️ Preuzmi sve svoje podatke</a>
            <button onClick={() => setShowDelete(true)} className="text-sm text-left" style={{ color: '#c0392b' }}>🗑️ Trajno obriši nalog</button>
            <div className="pt-1"><LogoutButton /></div>
          </div>
        </div>
      </section>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Obriši nalog">
        <h3 className="title-serif text-xl" style={{ color: 'var(--text)' }}>Trajno obrisati nalog?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Ovo briše sve tvoje podatke zauvek — planove, istoriju, profil. Ne može se poništiti.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" onClick={deleteAccount} loading={deleting}>Da, obriši sve</Button>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Otkaži</Button>
        </div>
      </Modal>
    </main>
  )
}
