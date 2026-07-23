'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/types/ferox'
import type { Locale } from '@/types/ferox'
import { DEFAULT_LOCALE } from '@/lib/locale'
import { getDict } from '@/lib/i18n/dict'
import { detectTimezone } from '@/lib/date'


interface FormData {
  name: string
  locale: Locale
}

// Kratak opis uz svaki jezik — na tom istom jeziku, jer korisnik još nije izabrao.
const LOCALE_DESC: Record<Locale, string> = {
  sr: 'AI ti piše plan i rezime na srpskom',
  en: 'AI writes your plan and recap in English',
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

function OptionCard({
  emoji, title, desc, selected, onClick,
}: { emoji: string; title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-[var(--r-md)] border transition-all duration-200 active:scale-[0.99]"
      style={{
        borderColor: selected ? 'transparent' : 'var(--border)',
        backgroundColor: selected ? 'transparent' : 'var(--surface)',
        backgroundImage: selected ? 'linear-gradient(135deg, var(--gold), var(--gold-deep))' : 'none',
        color: selected ? 'var(--gold-fg)' : 'var(--text)',
        boxShadow: selected ? 'var(--sh-gold)' : 'var(--sh-xs)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs opacity-70 mt-0.5">{desc}</div>
        </div>
      </div>
    </button>
  )
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 20 : 8,
            height: 8,
            background: i + 1 <= current ? 'var(--gold)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

export default function OnboardingFlow({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: initialName,
    locale: DEFAULT_LOCALE,
  })
  // Tekst prati IZABRANI jezik uživo (ne profil) — čim izabere, ostatak je na tom jeziku.
  const t = getDict(form.locale)

  function next() {
    setDir(1)
    setStep(s => s + 1)
  }

  function back() {
    setDir(-1)
    setStep(s => s - 1)
  }

  async function saveProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      name: form.name,
      locale: form.locale,
      timezone: detectTimezone(), // prepoznato iz pregledača — bez pitanja korisniku
      completed_once: true,
    }).eq('id', user.id)
  }

  async function finish() {
    setLoading(true)
    await saveProfile()
    router.push('/')
    router.refresh()
  }


  const steps: Record<number, React.ReactNode> = {
    1: (
      <div className="flex flex-col items-center text-center gap-6">
        <div className="animate-fade-slide logo foil text-8xl tracking-widest">
          F
        </div>
        <div>
          <h1 className="title-serif text-4xl mb-2" style={{ color: 'var(--text)' }}>
            {t.onboarding.welcomeTitle}
          </h1>
          <p className="text-sm leading-relaxed max-w-[280px]" style={{ color: 'var(--text-muted)' }}>
            {t.onboarding.welcomeSub}
          </p>
        </div>
        <Button size="lg" className="w-full max-w-[280px]" onClick={next}>
          {t.onboarding.start}
        </Button>
      </div>
    ),

    // Jezik je PRVI izbor — da sve posle njega može da bude na tom jeziku.
    // Naslov i dugme su dvojezični jer korisnik još nije izabrao.
    2: (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Jezik · Language
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Izaberi jezik · Choose your language
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {LOCALES.map(l => (
            <OptionCard
              key={l}
              emoji={LOCALE_FLAGS[l]}
              title={LOCALE_LABELS[l]}
              desc={LOCALE_DESC[l]}
              selected={form.locale === l}
              onClick={() => setForm(f => ({ ...f, locale: l }))}
            />
          ))}
        </div>
        <Button size="lg" className="w-full" onClick={next}>
          Dalje · Next →
        </Button>
      </div>
    ),

    3: (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            {t.onboarding.nameTitle}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.onboarding.nameSub}
          </p>
        </div>
        <Input
          id="name"
          placeholder={t.onboarding.namePlaceholder}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          autoFocus
        />
        <Button
          size="lg"
          className="w-full"
          onClick={finish}
          loading={loading}
          disabled={!form.name.trim()}
        >
          {t.onboarding.enter}
        </Button>
      </div>
    ),

  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row">
      {/* Brand panel — desktop only */}
      <aside
        className="hidden lg:flex lg:flex-col lg:justify-between lg:w-[44%] lg:max-w-[600px] shrink-0 p-14"
        style={{ background: 'color-mix(in srgb, var(--gold-tint) 55%, var(--surface))', borderRight: '1px solid var(--hairline)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-[14px] text-[var(--gold-fg)] logo text-2xl" style={{ backgroundImage: 'linear-gradient(135deg, var(--gold-light), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }} aria-hidden>F</span>
          <span className="logo text-3xl foil">Ferox</span>
        </div>
        <div>
          <h2 className="title-serif text-[2.6rem] leading-[1.1]" style={{ color: 'var(--text)' }}>
            {t.onboarding.brandLine1}<br /><span className="foil">{t.onboarding.brandLine2}</span>
          </h2>
          <p className="text-base mt-6 max-w-[44ch]" style={{ color: 'var(--text-muted)' }}>
            {t.onboarding.brandSub}
          </p>
        </div>
      </aside>

      {/* Koraci */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-12">
        <div className="flex flex-col justify-center max-w-[460px] mx-auto w-full py-8">
          {step > 1 && (
            <button
              onClick={back}
              className="self-start mb-4 text-sm flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              {t.common.back}
            </button>
          )}

          <StepDots total={3} current={step} />

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
