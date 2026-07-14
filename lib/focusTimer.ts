// Shared Pomodoro (fokus) timer state — singleton unutar jedne browser sesije.
// Živi van React komponenti, pa odbrojavanje preživljava navigaciju između stranica.
// Paralelan sa lib/breakTimer.ts, ali nezavisan (svoj audio + interval).

export const f = {
  focusMins: 25,
  focusSecs: 25 * 60,
  running: false,
  alarming: false,
  initialized: false, // da se trajanje iz profila postavi samo jednom po sesiji
  tickId: null as ReturnType<typeof setInterval> | null,
  alarmId: null as ReturnType<typeof setInterval> | null,
  audioCtx: null as AudioContext | null,
}

export function ensureFocusAudioCtx() {
  if (!f.audioCtx) {
    try { f.audioCtx = new AudioContext() } catch { return }
  }
  if (f.audioCtx.state === 'suspended') f.audioCtx.resume()
}

export function playFocusBeep() {
  try {
    if (!f.audioCtx || f.audioCtx.state !== 'running') return
    ;[660, 880, 660].forEach((freq, i) => {
      const ctx = f.audioCtx!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.45)
      osc.start(ctx.currentTime + i * 0.22)
      osc.stop(ctx.currentTime + i * 0.22 + 0.45)
    })
  } catch {}
}

export function startFocusAlarm() {
  f.alarming = true
  playFocusBeep()
  f.alarmId = setInterval(playFocusBeep, 2500)
}

export function stopFocusAlarm() {
  f.alarming = false
  if (f.alarmId) { clearInterval(f.alarmId); f.alarmId = null }
}

export function tickFocus() {
  if (f.focusSecs <= 1) {
    f.focusSecs = 0
    f.running = false
    if (f.tickId) { clearInterval(f.tickId); f.tickId = null }
    startFocusAlarm()
  } else {
    f.focusSecs--
  }
}

export function startFocus() {
  if (f.alarming || f.running || f.focusSecs <= 0) return
  f.running = true
  if (!f.tickId) f.tickId = setInterval(tickFocus, 1000)
}

export function pauseFocus() {
  f.running = false
  if (f.tickId) { clearInterval(f.tickId); f.tickId = null }
}

export function selectFocus(mins: number) {
  pauseFocus()
  stopFocusAlarm()
  f.focusMins = mins
  f.focusSecs = mins * 60
}

export function resetFocus() {
  pauseFocus()
  stopFocusAlarm()
  f.focusSecs = f.focusMins * 60
}
