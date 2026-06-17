import type { Rhythm } from '@/types/ferox'

export interface TimeBlock {
  label: string
  emoji: string
  color: string
  timeRange: string
  start: number
  end: number
}

export function calcBlocks(wakeTime: string, sleepTime: string, rhythm: Rhythm): TimeBlock[] {
  const [wh] = wakeTime.split(':').map(Number)
  const [sh] = sleepTime.split(':').map(Number)
  const bedHour = sh < 12 ? sh + 24 : sh

  const totalHours = bedHour - wh
  const q = Math.floor(totalHours / 4)

  const b1End = wh + q
  const b2End = b1End + q
  const b3End = b2End + q

  function fmt(h: number) {
    const hh = h % 24
    return `${String(hh).padStart(2, '0')}:00`
  }

  return [
    { label: 'Jutro',      emoji: '🌅', color: 'rgba(212,116,42,0.15)',  timeRange: `${fmt(wh)} – ${fmt(b1End)}`, start: wh,   end: b1End },
    { label: 'Prepodne',   emoji: '☀️', color: 'rgba(212,116,42,0.10)',  timeRange: `${fmt(b1End)} – ${fmt(b2End)}`, start: b1End, end: b2End },
    { label: 'Popodne',    emoji: '🌤️', color: 'rgba(100,120,200,0.10)', timeRange: `${fmt(b2End)} – ${fmt(b3End)}`, start: b2End, end: b3End },
    { label: 'Veče',       emoji: '🌙', color: 'rgba(100,80,180,0.12)',  timeRange: `${fmt(b3End)} – ${fmt(bedHour % 24)}`, start: b3End, end: bedHour },
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

export function sleepQuality(hours: number): string {
  if (hours >= 8) return '😴 Odlično spavanje'
  if (hours >= 7) return '👍 Dobro spavanje'
  if (hours >= 6) return '😐 Solidno'
  if (hours >= 5) return '🥱 Malo manje od idealnog'
  return '😩 Nedovoljno sna'
}
