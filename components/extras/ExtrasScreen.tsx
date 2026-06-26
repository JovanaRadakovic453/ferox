'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import { DEFAULTS } from '@/lib/config'

function playDone() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch {}
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function ExtrasScreen({ initialPomodoro, profileId }: { initialPomodoro: number; profileId: string }) {
  const toast = useToast()

  // — Pomodoro —
  const [pomodoro, setPomodoro] = useState(initialPomodoro)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      pomodoro_minutes: Math.min(DEFAULTS.pomodoroMax, Math.max(DEFAULTS.pomodoroMin, pomodoro)),
      updated_at: new Date().toISOString(),
    }).eq('id', profileId)
    setSaving(false)
    if (error) toast({ message: 'Nije sačuvano — pokušaj ponovo', variant: 'error' })
    else toast({ message: 'Sačuvano ✓', variant: 'success' })
  }

  // — Tajmer odmora —
  const [breakMins, setBreakMins] = useState(10)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            playDone()
            toast({ message: 'Pauza je gotova! ☕', variant: 'success' })
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function selectBreak(mins: number) {
    setRunning(false)
    setBreakMins(mins)
    setSecondsLeft(mins * 60)
  }

  function reset() {
    setRunning(false)
    setSecondsLeft(breakMins * 60)
  }

  const totalSecs = breakMins * 60
  const circumference = 427.3
  const progress = totalSecs > 0 ? (secondsLeft / totalSecs) : 0

  return (
    <main className="flex flex-col gap-6 lg:gap-7 pb-2">
      <header className="pt-2">
        <div className="hidden lg:block mb-2"><span className="section-label">Fokus alati</span></div>
        <h1 className="display foil text-3xl lg:text-5xl">Alati</h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Podesi fokus sesiju i odmore.</p>
      </header>

      {/* Pomodoro */}
      <section className="card p-6 flex flex-col items-center gap-6">
        <div className="self-start">
          <p className="font-medium text-sm">🍅 Pomodoro</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Koliko minuta traje jedna fokus sesija</p>
        </div>

        <div className="relative w-40 h-40">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--surface2)" strokeWidth="12" />
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(pomodoro / 90) * circumference} ${circumference}`}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 0.25s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="display text-5xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>{pomodoro}</span>
            <span className="text-[0.65rem] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>min</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPomodoro(Math.max(DEFAULTS.pomodoroMin, pomodoro - 5))}
            className="w-11 h-11 rounded-full text-xl font-bold flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>−</button>
          <div className="flex gap-2">
            {[15, 25, 45, 60].map(p => (
              <button key={p} type="button" onClick={() => setPomodoro(p)}
                className="text-xs px-3 py-2 rounded-[var(--r-md)] transition-colors"
                style={{
                  background: pomodoro === p ? 'var(--gold-tint)' : 'var(--surface2)',
                  border: `1px solid ${pomodoro === p ? 'var(--gold)' : 'var(--border)'}`,
                  color: pomodoro === p ? 'var(--gold)' : 'var(--text-muted)',
                }}>{p}</button>
            ))}
          </div>
          <button type="button" onClick={() => setPomodoro(Math.min(DEFAULTS.pomodoroMax, pomodoro + 5))}
            className="w-11 h-11 rounded-full text-xl font-bold flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>+</button>
        </div>

        <Button size="lg" className="w-full max-w-xs" onClick={save} loading={saving}>Sačuvaj</Button>
      </section>

      {/* Tajmer odmora */}
      <section className="card p-6 flex flex-col items-center gap-6">
        <div className="self-start">
          <p className="font-medium text-sm">⏱️ Tajmer odmora</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Odbrojava pauzu i javi ti kad je vreme da nastaviš</p>
        </div>

        <div className="relative w-40 h-40">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--surface2)" strokeWidth="12" />
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke={secondsLeft === 0 ? 'var(--gold)' : running ? '#60a5fa' : 'var(--gold)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${progress * circumference} ${circumference}`}
              transform="rotate(-90 80 80)"
              style={{ transition: running ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.25s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="display text-4xl leading-none tabular-nums" style={{ color: 'var(--text)' }}>{fmt(secondsLeft)}</span>
            <span className="text-[0.65rem] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              {secondsLeft === 0 ? 'gotovo' : running ? 'odmor' : 'spreman'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {[5, 10, 15, 20].map(m => (
            <button key={m} type="button" onClick={() => selectBreak(m)}
              className="text-xs px-3 py-2 rounded-[var(--r-md)] transition-colors"
              style={{
                background: breakMins === m ? 'var(--gold-tint)' : 'var(--surface2)',
                border: `1px solid ${breakMins === m ? 'var(--gold)' : 'var(--border)'}`,
                color: breakMins === m ? 'var(--gold)' : 'var(--text-muted)',
              }}>{m} min</button>
          ))}
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => setRunning(r => !r)}
            disabled={secondsLeft === 0}
          >
            {running ? 'Pauziraj' : 'Kreni'}
          </Button>
          <button
            type="button"
            onClick={reset}
            className="px-4 rounded-[var(--r-md)] text-sm font-medium transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}
          >Resetuj</button>
        </div>
      </section>
    </main>
  )
}
