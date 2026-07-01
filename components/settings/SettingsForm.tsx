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
import type { UserProfile, Zone } from '@/types/ferox'

const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']

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

export default function SettingsForm({ profile, email, zones: initialZones = [] }: { profile: UserProfile; email: string; zones?: Zone[] }) {
  const router = useRouter()
  const toast = useToast()

  const [name, setName] = useState(profile.name ?? '')
  const [restDays, setRestDays] = useState<number[]>(profile.rest_days ?? [0, 6])
  const [microFeedback, setMicroFeedback] = useState(profile.micro_feedback ?? true)
  const [soundEnabled, setSoundEnabled] = useState(profile.sound_enabled ?? false)
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [newZoneName, setNewZoneName] = useState('')

  async function addZone() {
    if (!newZoneName.trim()) return
    const name = newZoneName.trim()
    setNewZoneName('')
    const res = await fetch('/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon: '📁', position: zones.length }),
    })
    if (res.ok) {
      const json = await res.json()
      setZones(prev => [...prev, json])
    } else {
      toast({ message: 'Oblast nije dodana — pokušaj ponovo', variant: 'error' })
    }
  }

  async function deleteZone(id: string) {
    const deleted = zones.find(z => z.id === id)
    setZones(prev => prev.filter(z => z.id !== id))
    const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      if (deleted) setZones(prev => [...prev, deleted].sort((a, b) => a.position - b.position))
      toast({ message: 'Oblast nije obrisana — pokušaj ponovo', variant: 'error' })
    }
  }

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      rest_days: restDays,
      micro_feedback: microFeedback,
      sound_enabled: soundEnabled,
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
      </section>

      {/* Slobodni dani */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Slobodni dani</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Ne lome streak</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => <Chip key={i} active={restDays.includes(i)} onClick={() => toggle(restDays, i, setRestDays)}>{d}</Chip>)}
          </div>
        </div>
      </section>

      {/* Oblasti */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">Oblasti</p>

        <div className="flex flex-col gap-2">
          {zones.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nema oblasti — dodaj neku ispod.</p>
          )}
          {zones.map(z => (
            <div
              key={z.id}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--r-md)] border"
              style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
            >
              <span className="text-lg shrink-0">{z.icon}</span>
              <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{z.name}</span>
              <button
                type="button"
                onClick={() => deleteZone(z.id)}
                aria-label={`Obriši ${z.name}`}
                className="text-xs opacity-40 hover:opacity-80 transition-opacity shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >✕</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addZone() }}
            placeholder="Dodaj oblast..."
            className="field h-10 px-3 text-sm flex-1"
          />
          <button
            type="button"
            disabled={!newZoneName.trim()}
            onClick={addZone}
            className="px-4 h-10 rounded-[var(--r-md)] text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            + Dodaj
          </button>
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
