'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { REMINDERS } from '@/lib/config'
import { reminderHourOf } from '@/lib/reminders'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/types/ferox'
import type { UserProfile, Locale } from '@/types/ferox'
import { toLocale } from '@/lib/locale'
import { toTimezone } from '@/lib/date'
import { useT } from '@/components/i18n/I18nProvider'
import { getDict } from '@/lib/i18n/dict'
import LineIcon from '@/components/ui/LineIcon'


function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center text-xs font-medium py-2 rounded-[var(--r-md)] transition-colors"
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
  const t = useT()

  const [name, setName] = useState(profile.name ?? '')
  const [locale, setLocale] = useState<Locale>(toLocale(profile.locale))
  const [restDays, setRestDays] = useState<number[]>(profile.rest_days ?? [0, 6])
  const [microFeedback, setMicroFeedback] = useState(profile.micro_feedback ?? true)
  const [soundEnabled, setSoundEnabled] = useState(profile.sound_enabled ?? false)
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [notifActive, setNotifActive] = useState(!!profile.push_subscription)
  // Sat kad podsetnik stiže. Samo puni sati — budilnik radi na pun sat, pa minuti
  // ne bi mogli da se ispoštuju (vidi lib/reminders.ts).
  const [reminderHour, setReminderHour] = useState<number>(reminderHourOf(profile.reminder_time))
  const [hourSaving, setHourSaving] = useState(false)

  async function saveReminderHour(h: number) {
    setReminderHour(h)
    setHourSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ reminder_time: `${String(h).padStart(2, '0')}:00` })
      .eq('id', profile.id)
    setHourSaving(false)
    toast(error
      ? { message: t.settings.saveFailed, variant: 'error' }
      : { message: t.settings.reminderTimeSaved(h), variant: 'success' })
  }

  const hourPicker = (
    <div className="flex items-center gap-2">
      <label className="text-xs" style={{ color: 'var(--text-muted)' }} htmlFor="reminder-hour">
        {t.settings.reminderTimeLabel}
      </label>
      <select
        id="reminder-hour"
        value={reminderHour}
        onChange={e => saveReminderHour(Number(e.target.value))}
        disabled={hourSaving}
        className="field field-select h-9 px-2 text-sm"
        style={{ width: 'auto' }}
      >
        {Array.from({ length: REMINDERS.maxHour - REMINDERS.minHour + 1 }, (_, i) => REMINDERS.minHour + i).map(h => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
        ))}
      </select>
    </div>
  )
  const [notifLoading, setNotifLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  const [googleConnected, setGoogleConnected] = useState(!!profile.google_refresh_token)
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false)

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
    if (error) toast({ message: t.settings.saveFailed, variant: 'error' })
    else { toast({ message: t.settings.saved, variant: 'success' }); router.refresh() }
  }

  async function activateNotifications() {
    setNotifLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast({ message: t.settings.permDenied, variant: 'error' })
        return
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (res.ok) { setNotifActive(true); toast({ message: t.settings.reminderOn, variant: 'success' }) }
      else toast({ message: t.settings.failedRetry, variant: 'error' })
    } catch {
      toast({ message: t.settings.activateError, variant: 'error' })
    } finally {
      setNotifLoading(false)
    }
  }

  async function deactivateNotifications() {
    setNotifLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
      await fetch('/api/notifications/subscribe', { method: 'DELETE' })
      setNotifActive(false)
      toast({ message: t.settings.reminderOff, variant: 'success' })
    } catch {
      toast({ message: t.settings.deactivateError, variant: 'error' })
    } finally {
      setNotifLoading(false)
    }
  }

  async function sendTestNotification() {
    setTestLoading(true)
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' })
      if (res.ok) toast({ message: t.settings.testSent, variant: 'success' })
      else toast({ message: t.settings.sendFailed, variant: 'error' })
    } finally {
      setTestLoading(false)
    }
  }

  async function disconnectGoogle() {
    setGoogleDisconnecting(true)
    const res = await fetch('/api/integrations/google/disconnect', { method: 'DELETE' })
    setGoogleDisconnecting(false)
    if (res.ok) { setGoogleConnected(false); toast({ message: t.settings.googleDisconnected, variant: 'success' }) }
    else toast({ message: t.settings.failedRetry, variant: 'error' })
  }

  async function persistTheme(theme: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ theme }).eq('id', profile.id)
  }

  // Jezik se snima odmah (kao tema) — bez "Sačuvaj". Na grešku vraćamo izbor.
  async function pickLocale(next: Locale) {
    if (next === locale) return
    const before = locale
    setLocale(next)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ locale: next }).eq('id', profile.id)
    if (error) {
      setLocale(before)
      toast({ message: t.settings.langSaveFailed, variant: 'error' })
      return
    }
    // Poruka ide na NOVOM jeziku (rečnik `t` je još stari) + osvežavamo ekrane.
    toast({ message: getDict(next).settings.langSwitched, variant: 'success' })
    router.refresh()
  }

  async function changePassword() {
    if (newPassword.length < 6) { toast({ message: t.settings.passwordTooShort, variant: 'error' }); return }
    setChangingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPw(false)
    if (error) toast({ message: error.message, variant: 'error' })
    else { setNewPassword(''); toast({ message: t.settings.passwordChanged, variant: 'success' }) }
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'POST' })
    if (res.ok) {
      window.location.href = '/login'
    } else {
      const body = await res.json().catch(() => ({}))
      toast({ message: body.error?.message ?? t.settings.deleteFailed, variant: 'error' })
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <main className="flex flex-col gap-5 lg:gap-6 pb-2 lg:max-w-5xl lg:mx-auto lg:w-full">
      <header className="pt-2">
        <div className="hidden lg:block mb-2"><span className="section-label">{t.settings.account}</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">{t.settings.title}</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>{email}</p>
      </header>

      {/* Dve kolone. Raspored: levo Profil · Izgled · Podsetnik, desno Slobodni ·
          Aplikacija · Google. Poravnanje DONJIH ivica ne postiže se ručnim slaganjem
          (dve gomile kartica retko izađu na isti piksel) nego pravilom: obe kolone
          iste visine (items-stretch) + poslednja kartica legne na dno (justify-between).
          Tako se dna poklope bez obzira na sadržaj i buduće izmene. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
      {/* Leva kolona */}
      <div className="flex flex-col gap-5 lg:justify-between">
      {/* Profil */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.profileSection}</p>
        <Input id="name" label={t.settings.name} value={name} onChange={e => setName(e.target.value)} />
      </section>

      {/* Izgled — tema, animacije i zvuk. Grupisano ovde (levo) da leva kolona
          poraste i poravna se sa desnom; tema je tako i „gore", kako je traženo. */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.appearanceSection}</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{t.settings.theme}</label>
          <ThemeToggle onChange={persistTheme} />
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm">{t.settings.microFeedback}</span>
          <input type="checkbox" checked={microFeedback} onChange={e => setMicroFeedback(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm">{t.settings.sound}</span>
          <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
        </label>
      </section>

      {/* Jutarnji podsetnik — sopstvena kartica (ranije nabijen u „Aplikacija") */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.morningReminder}</p>
        {notifActive ? (
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-3 px-3.5 py-3 rounded-[var(--r-md)]"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
            >
              <LineIcon name="bell" size={17} style={{ color: 'var(--gold)' }} />
              <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {t.settings.reminderActive}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>{t.settings.activeBadge}</span>
            </div>
            {hourPicker}
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={testLoading}
              className="w-full text-xs h-8 rounded-[var(--r-md)] font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
            >
              {testLoading ? '...' : t.settings.sendTest}
            </button>
            <button
              type="button"
              onClick={deactivateNotifications}
              disabled={notifLoading}
              className="text-xs text-left transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: 'var(--text-muted)' }}
            >
              {t.settings.turnOffReminders}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {hourPicker}
            <button
              type="button"
              onClick={activateNotifications}
              disabled={notifLoading}
              className="w-full text-sm h-9 rounded-[var(--r-md)] font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
            >
              {notifLoading ? t.settings.activating : t.settings.activateReminder}
            </button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.settings.reminderHint}
            </p>
          </div>
        )}
      </section>
      </div>

      {/* Desna kolona */}
      <div className="flex flex-col gap-5 lg:justify-between">
      {/* Slobodni dani — prešli desno (uz Profil levo, kao par gore) da se kolone poravnaju */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.restDaysSection}</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{t.settings.restDaysHint}</label>
          <div className="grid grid-cols-7 gap-1.5">
            {t.settings.weekdays.map((d, i) => <Chip key={i} active={restDays.includes(i)} onClick={() => toggle(restDays, i, setRestDays)}>{d}</Chip>)}
          </div>
        </div>
      </section>

      {/* Aplikacija — jezik i vremenska zona */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.appSection}</p>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
            {t.settings.language}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {LOCALES.map(l => (
              <Chip key={l} active={locale === l} onClick={() => pickLocale(l)}>
                {LOCALE_FLAGS[l]} {LOCALE_LABELS[l]}
              </Chip>
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {t.settings.languageHint}
          </p>
        </div>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{t.settings.timezone}</label>
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <LineIcon name="globe" size={17} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text)' }}>{toTimezone(profile.timezone)}</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{t.settings.timezoneHint}</p>
        </div>
      </section>

      {/* Google Kalendar — sopstvena kartica */}
      <section className="card p-5 flex flex-col gap-4">
        <p className="section-label">{t.settings.googleCal}</p>
        {googleConnected ? (
          <div className="flex items-center justify-between px-3.5 py-3 rounded-[var(--r-md)]"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t.settings.connected}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.settings.connectedHint}</span>
            </div>
            <button
              type="button"
              onClick={disconnectGoogle}
              disabled={googleDisconnecting}
              className="text-xs transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: 'var(--text-muted)' }}
            >
              {googleDisconnecting ? '...' : t.settings.disconnect}
            </button>
          </div>
        ) : (
          <a
            href="/api/integrations/google/auth"
            className="flex items-center justify-center gap-2 w-full text-sm h-9 rounded-[var(--r-md)] font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t.settings.connectGoogle}
          </a>
        )}
      </section>
      </div>
      </div>

      <div className="lg:flex lg:justify-center">
        <Button size="lg" className="w-full lg:w-auto lg:px-20" onClick={save} loading={saving}>{t.settings.saveChanges}</Button>
      </div>

      {/* Nalog */}
      <section className="card p-5 lg:p-6 flex flex-col gap-4">
        <p className="section-label">{t.settings.accountSection}</p>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-2">
            <Input id="pw" label={t.settings.newPassword} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t.settings.passwordPlaceholder} />
            <Button size="sm" variant="secondary" onClick={changePassword} loading={changingPw} disabled={!newPassword}>{t.settings.changePassword}</Button>
          </div>
          <div className="flex flex-col gap-3">
            <a href="/api/account/export" className="text-sm font-medium" style={{ color: 'var(--gold)' }}>{t.settings.exportData}</a>
            <button onClick={() => setShowDelete(true)} className="text-sm text-left" style={{ color: 'var(--danger)' }}>{t.settings.deleteAccount}</button>
            <div className="pt-1"><LogoutButton /></div>
          </div>
        </div>
      </section>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={t.settings.deleteModalTitle}>
        <h3 className="title-serif text-xl" style={{ color: 'var(--text)' }}>{t.settings.deleteConfirmTitle}</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.settings.deleteConfirmBody}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" onClick={deleteAccount} loading={deleting}>{t.settings.deleteConfirmYes}</Button>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>{t.common.cancel}</Button>
        </div>
      </Modal>
    </main>
  )
}
