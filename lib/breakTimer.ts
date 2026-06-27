// Shared break timer state — singleton unutar jedne browser sesije.
// Živi van React komponenti, pa preživljava navigaciju između stranica.

export const t = {
  breakMins: 10,
  breakSecs: 10 * 60,
  running: false,
  alarming: false,
  tickId: null as ReturnType<typeof setInterval> | null,
  alarmId: null as ReturnType<typeof setInterval> | null,
  audioCtx: null as AudioContext | null,
}

export function ensureAudioCtx() {
  if (!t.audioCtx) {
    try { t.audioCtx = new AudioContext() } catch { return }
  }
  if (t.audioCtx.state === 'suspended') t.audioCtx.resume()
}

export function playBeep() {
  try {
    if (!t.audioCtx || t.audioCtx.state !== 'running') return
    ;[660, 880, 660].forEach((freq, i) => {
      const ctx = t.audioCtx!
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

export function startAlarm() {
  t.alarming = true
  playBeep()
  t.alarmId = setInterval(playBeep, 2500)
}

export function stopAlarm() {
  t.alarming = false
  if (t.alarmId) { clearInterval(t.alarmId); t.alarmId = null }
}

export function tick() {
  if (t.breakSecs <= 1) {
    t.breakSecs = 0
    t.running = false
    if (t.tickId) { clearInterval(t.tickId); t.tickId = null }
    startAlarm()
  } else {
    t.breakSecs--
  }
}

export function startTimer() {
  if (t.alarming || t.running || t.breakSecs <= 0) return
  t.running = true
  if (!t.tickId) t.tickId = setInterval(tick, 1000)
}

export function pauseTimer() {
  t.running = false
  if (t.tickId) { clearInterval(t.tickId); t.tickId = null }
}

export function selectBreak(mins: number) {
  pauseTimer()
  stopAlarm()
  t.breakMins = mins
  t.breakSecs = mins * 60
}

export function resetTimer() {
  pauseTimer()
  stopAlarm()
  t.breakSecs = t.breakMins * 60
}
