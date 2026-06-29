'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type Reason = 'work' | 'school' | 'personal' | 'all'
type Rhythm = 'morning' | 'midday' | 'evening' | 'mixed'

interface FormData {
  name: string
  reason: Reason | null
  rhythm: Rhythm | null
  morningTasks: string[]
  eveningTasks: string[]
}

const ZONE_PRESETS = {
  entrepreneur: [
    { name: 'Posao', icon: '💼' },
    { name: 'Finansije', icon: '💰' },
    { name: 'Zdravlje', icon: '💪' },
    { name: 'Sport', icon: '🏃' },
    { name: 'Lično', icon: '🌱' },
  ],
  student: [
    { name: 'Fakultet', icon: '🎓' },
    { name: 'Projekti', icon: '📝' },
    { name: 'Sport', icon: '🏃' },
    { name: 'Lično', icon: '🌱' },
  ],
}

const TASK_CHIPS = [
  { value: 'planning',      label: '🗓️ Planiranje' },
  { value: 'creative',      label: '🎨 Kreativno' },
  { value: 'analytical',    label: '🧠 Analitičko' },
  { value: 'learning',      label: '📚 Učenje' },
  { value: 'exercise',      label: '💪 Vežbanje' },
  { value: 'meetings',      label: '👥 Sastanci' },
  { value: 'communication', label: '💬 Komunikacija' },
  { value: 'admin',         label: '📋 Admin' },
  { value: 'reading',       label: '📖 Čitanje' },
  { value: 'meditation',    label: '🧘 Meditacija' },
  { value: 'light',         label: '🌿 Lagano' },
  { value: 'rest',          label: '😴 Odmor' },
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

function Chip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border active:scale-95"
      style={{
        borderColor: selected ? 'transparent' : 'var(--border)',
        backgroundColor: selected ? 'transparent' : 'var(--surface2)',
        backgroundImage: selected ? 'linear-gradient(135deg, var(--gold), var(--gold-deep))' : 'none',
        color: selected ? '#fff' : 'var(--text)',
        boxShadow: selected ? 'var(--sh-gold)' : 'none',
        textShadow: selected ? '0 1px 2px rgba(70,30,2,0.45)' : undefined,
      }}
    >
      {label}
    </button>
  )
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
        color: selected ? '#fff' : 'var(--text)',
        boxShadow: selected ? 'var(--sh-gold)' : 'var(--sh-xs)',
        textShadow: selected ? '0 1px 2px rgba(70,30,2,0.45)' : undefined,
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
    reason: null,
    rhythm: null,
    morningTasks: [],
    eveningTasks: [],
  })
  const [zones, setZones] = useState<Array<{ name: string; icon: string }>>([])
  const [newZoneName, setNewZoneName] = useState('')

  function next() {
    setDir(1)
    setStep(s => s + 1)
  }

  function back() {
    setDir(-1)
    setStep(s => s - 1)
  }

  function toggleChip(field: 'morningTasks' | 'eveningTasks', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      name: form.name,
      reason: form.reason,
      rhythm: form.rhythm,
      morning_tasks: form.morningTasks,
      evening_tasks: form.eveningTasks,
      completed_once: true,
    }).eq('id', user.id)

    const validZones = zones.filter(z => z.name.trim())
    await Promise.all(
      validZones.map((z, i) =>
        fetch('/api/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: z.name.trim(), icon: z.icon, position: i }),
        })
      )
    )

    router.push('/')
    router.refresh()
  }

  const steps: Record<number, React.ReactNode> = {
    1: (
      <div className="flex flex-col items-center text-center gap-6">
        <div className="animate-fade-slide display foil text-8xl tracking-widest">
          F
        </div>
        <div>
          <h1 className="title-serif text-4xl mb-2" style={{ color: 'var(--text)' }}>
            Dobrodošla u Ferox
          </h1>
          <p className="text-sm leading-relaxed max-w-[280px]" style={{ color: 'var(--text-muted)' }}>
            Organizuj dan po oblastima svog života i prati šta si zaista uradila.
          </p>
        </div>
        <Button size="lg" className="w-full max-w-[280px]" onClick={next}>
          Počnimo →
        </Button>
      </div>
    ),

    2: (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Kako da te zovemo?
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ime koje ćeš videti svaki dan
          </p>
        </div>
        <Input
          id="name"
          placeholder="Tvoje ime"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          autoFocus
        />
        <Button
          size="lg"
          className="w-full"
          onClick={next}
          disabled={!form.name.trim()}
        >
          Dalje →
        </Button>
      </div>
    ),

    3: (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Zašto koristiš Ferox?
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pomoći će nam da prilagodimo preporuke
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <OptionCard emoji="💼" title="Posao" desc="Projekti, rokovi, poslovni zadaci" selected={form.reason === 'work'} onClick={() => setForm(f => ({ ...f, reason: 'work' }))} />
          <OptionCard emoji="🎓" title="Škola / Fakultet" desc="Učenje, ispiti, predavanja" selected={form.reason === 'school'} onClick={() => setForm(f => ({ ...f, reason: 'school' }))} />
          <OptionCard emoji="🌱" title="Lični razvoj" desc="Navike, hobiji, ciljevi" selected={form.reason === 'personal'} onClick={() => setForm(f => ({ ...f, reason: 'personal' }))} />
          <OptionCard emoji="✨" title="Sve pomalo" desc="Kombinacija svega navedenog" selected={form.reason === 'all'} onClick={() => setForm(f => ({ ...f, reason: 'all' }))} />
        </div>
        <Button size="lg" className="w-full" onClick={next} disabled={!form.reason}>
          Dalje →
        </Button>
      </div>
    ),

    4: (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Kad si najproduktivnija?
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Kada tokom dana si najproduktivnija?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <OptionCard emoji="🌅" title="Jutarnji tip" desc="Najbolja između 6h i 12h" selected={form.rhythm === 'morning'} onClick={() => setForm(f => ({ ...f, rhythm: 'morning' }))} />
          <OptionCard emoji="☀️" title="Podnevni tip" desc="Najbolja između 10h i 14h" selected={form.rhythm === 'midday'} onClick={() => setForm(f => ({ ...f, rhythm: 'midday' }))} />
          <OptionCard emoji="🌙" title="Večernji tip" desc="Najbolja posle 18h" selected={form.rhythm === 'evening'} onClick={() => setForm(f => ({ ...f, rhythm: 'evening' }))} />
          <OptionCard emoji="🌊" title="Mešovito" desc="Zavisi od dana i raspoloženja" selected={form.rhythm === 'mixed'} onClick={() => setForm(f => ({ ...f, rhythm: 'mixed' }))} />
        </div>
        <Button size="lg" className="w-full" onClick={next} disabled={!form.rhythm}>
          Dalje →
        </Button>
      </div>
    ),

    5: (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Tvoje navike
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Izaberi šta voliš da radiš ujutru i uveče
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>🌅 Ujutru obično radim:</p>
          <div className="flex flex-wrap gap-2">
            {TASK_CHIPS.map(chip => (
              <Chip
                key={chip.value}
                label={chip.label}
                selected={form.morningTasks.includes(chip.value)}
                onClick={() => toggleChip('morningTasks', chip.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>🌙 Uveče obično radim:</p>
          <div className="flex flex-wrap gap-2">
            {TASK_CHIPS.map(chip => (
              <Chip
                key={chip.value}
                label={chip.label}
                selected={form.eveningTasks.includes(chip.value)}
                onClick={() => toggleChip('eveningTasks', chip.value)}
              />
            ))}
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={next}>
          Dalje →
        </Button>
      </div>
    ),

    6: (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="title-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
            Tvoje oblasti
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Koje oblasti svog života pratiš? Svaki zadatak ćeš moći da rasporediš u oblast.
          </p>
        </div>

        {/* Preset dugmad */}
        <div className="flex gap-2">
          {(['entrepreneur', 'student'] as const).map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setZones(ZONE_PRESETS[preset])}
              className="flex-1 py-2.5 rounded-[var(--r-md)] border text-sm font-medium transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
            >
              {preset === 'entrepreneur' ? '💼 Preduzetnik' : '🎓 Student'}
            </button>
          ))}
        </div>

        {/* Lista zona */}
        <div className="flex flex-col gap-2">
          {zones.map((z, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--r-md)] border"
              style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
            >
              <span className="text-lg shrink-0">{z.icon}</span>
              <input
                value={z.name}
                onChange={e => setZones(prev => prev.map((zz, ii) => ii === i ? { ...zz, name: e.target.value } : zz))}
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={() => setZones(prev => prev.filter((_, ii) => ii !== i))}
                className="text-xs opacity-40 hover:opacity-80 transition-opacity shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Obriši oblast"
              >✕</button>
            </div>
          ))}
        </div>

        {/* Dodaj novu oblast */}
        <div className="flex gap-2">
          <input
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newZoneName.trim()) {
                setZones(prev => [...prev, { name: newZoneName.trim(), icon: '📁' }])
                setNewZoneName('')
              }
            }}
            placeholder="Dodaj oblast..."
            className="field h-10 px-3 text-sm flex-1"
          />
          <button
            type="button"
            disabled={!newZoneName.trim()}
            onClick={() => {
              if (newZoneName.trim()) {
                setZones(prev => [...prev, { name: newZoneName.trim(), icon: '📁' }])
                setNewZoneName('')
              }
            }}
            className="px-4 h-10 rounded-[var(--r-md)] text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            + Dodaj
          </button>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={finish}
          loading={loading}
          disabled={zones.filter(z => z.name.trim()).length === 0}
        >
          Kreiraj moj profil ✓
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
          <span className="grid place-items-center w-11 h-11 rounded-[14px] text-white title-serif text-2xl" style={{ backgroundImage: 'linear-gradient(135deg, var(--gold-light), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }} aria-hidden>F</span>
          <span className="title-serif text-3xl foil">Ferox</span>
        </div>
        <div>
          <h2 className="title-serif text-[2.6rem] leading-[1.1]" style={{ color: 'var(--text)' }}>
            Tvoje obaveze,<br /><span className="foil">tvoje oblasti.</span>
          </h2>
          <p className="text-base mt-6 max-w-[44ch]" style={{ color: 'var(--text-muted)' }}>
            Organizuj dan po oblastima svog života — posao, zdravlje, lično. Sve na jednom mestu.
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
              ← Nazad
            </button>
          )}

          <StepDots total={6} current={step} />

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
