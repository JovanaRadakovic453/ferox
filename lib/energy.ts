import type { Rhythm } from '@/types/ferox'

export interface TimeBlock {
  label: string
  emoji: string
  color: string
  timeRange: string
  start: number
  end: number
}

// Block-size weights by chronotype — bigger windows where the user is sharper.
function blockWeights(rhythm: Rhythm): [number, number, number, number] {
  switch (rhythm) {
    case 'morning': return [0.30, 0.30, 0.22, 0.18]
    case 'evening': return [0.18, 0.22, 0.30, 0.30]
    case 'midday':  return [0.25, 0.30, 0.25, 0.20]
    default:        return [0.25, 0.25, 0.25, 0.25] // mixed
  }
}

// Splits awake hours (wake→sleep) into 4 chronotype-weighted blocks.
// The last block ends EXACTLY at bedHour so no awake hours are lost
// (the old version used Math.floor and dropped the remainder).
export function calcBlocks(wakeTime: string, sleepTime: string, rhythm: Rhythm): TimeBlock[] {
  const [wh] = wakeTime.split(':').map(Number)
  const [sh] = sleepTime.split(':').map(Number)
  const bedHour = sh < 12 ? sh + 24 : sh
  const totalHours = Math.max(4, bedHour - wh)
  const e4 = wh + totalHours // == bedHour (except for the very-short-day clamp)

  const w = blockWeights(rhythm)
  const cum = [w[0], w[0] + w[1], w[0] + w[1] + w[2]]
  let e1 = wh + Math.round(totalHours * cum[0])
  let e2 = wh + Math.round(totalHours * cum[1])
  let e3 = wh + Math.round(totalHours * cum[2])

  // Guarantee strictly increasing boundaries, each block >= 1h, last ends at e4.
  e1 = Math.min(Math.max(e1, wh + 1), e4 - 3)
  e2 = Math.min(Math.max(e2, e1 + 1), e4 - 2)
  e3 = Math.min(Math.max(e3, e2 + 1), e4 - 1)

  function fmt(h: number) {
    const hh = ((h % 24) + 24) % 24
    return `${String(hh).padStart(2, '0')}:00`
  }

  return [
    { label: 'Jutro',    emoji: '🌅', color: 'rgba(212,116,42,0.15)',  timeRange: `${fmt(wh)} – ${fmt(e1)}`, start: wh,  end: e1 },
    { label: 'Prepodne', emoji: '☀️',  color: 'rgba(45,106,79,0.15)',   timeRange: `${fmt(e1)} – ${fmt(e2)}`, start: e1,  end: e2 },
    { label: 'Popodne',  emoji: '🌤️', color: 'rgba(45,79,138,0.15)',   timeRange: `${fmt(e2)} – ${fmt(e3)}`, start: e2,  end: e3 },
    { label: 'Veče',     emoji: '🌙', color: 'rgba(106,45,138,0.15)',  timeRange: `${fmt(e3)} – ${fmt(e4)}`, start: e3,  end: e4 },
  ]
}

export function energyLabel(level: number): string {
  const map: Record<number, string> = {
    1: '🔥 Pun gas',
    2: '😊 Dobro',
    3: '😐 Prosečno',
    4: '🥱 Umorno',
    5: '🪫 Preživljavam',
  }
  return map[level] ?? ''
}

// Obrnuto od energyLabel: iz sačuvanog labela (npr. '🔥 Pun gas') vrati nivo 1–5.
// Koristi se da se pri ponovnom otvaranju plana (edit) vrati izabrana energija.
export function energyLevelFromLabel(label?: string | null): number | null {
  if (!label) return null
  for (let lvl = 1; lvl <= 5; lvl++) {
    if (energyLabel(lvl) === label) return lvl
  }
  return null
}

export function sleepQuality(hours: number): string {
  if (hours >= 8) return '😴 Odlično spavanje'
  if (hours >= 7) return '👍 Dobro spavanje'
  if (hours >= 6) return '😐 Solidno'
  if (hours >= 5) return '🥱 Malo manje od idealnog'
  return '😩 Nedovoljno sna'
}
