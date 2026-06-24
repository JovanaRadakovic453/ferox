import { describe, it, expect } from 'vitest'
import { calcBlocks, energyLabel, energyLevelFromLabel, sleepQuality } from '@/lib/energy'
import { assignTasksToBlocks, capacity, isHeavy, countHeavy, blockEnergyCurve } from '@/lib/plan'
import { isValidDayKey, addDays, dayKey, todayKey, tomorrowKey } from '@/lib/date'
import { calcSleepHours } from '@/lib/utils'
import { ENERGY_LABELS } from '@/types/ferox'
import type { Task, TaskType, Rhythm } from '@/types/ferox'

function task(type: TaskType, priority: Task['priority'] = 'medium', name = type): Task {
  return { name, type, priority, done: false, note: '' }
}
const sig = (r: ReturnType<typeof assignTasksToBlocks>) =>
  r.map(b => b.tasks.map(t => t.type).join(',')).join('|')

describe('calcBlocks', () => {
  it('covers all awake hours with no gaps (last block ends at bedtime)', () => {
    const b = calcBlocks('08:00', '23:00', 'mixed')
    expect(b[0].start).toBe(8)
    expect(b[3].end).toBe(23)
    for (let i = 1; i < 4; i++) expect(b[i].start).toBe(b[i - 1].end)
  })
  it('gives morning chronotype a bigger first block than evening', () => {
    const m = calcBlocks('08:00', '23:00', 'morning')
    const e = calcBlocks('08:00', '23:00', 'evening')
    expect(m[0].end - m[0].start).toBeGreaterThan(e[0].end - e[0].start)
  })
  it('handles after-midnight bedtime without losing hours', () => {
    const b = calcBlocks('09:00', '01:00', 'mixed') // bed = 25
    expect(b[0].start).toBe(9)
    expect(b[3].end).toBe(25)
  })
})

describe('energy-fit assignment', () => {
  const blocks = calcBlocks('08:00', '23:00', 'morning') // peak = block 0

  it('puts the heaviest task in the peak block at full energy', () => {
    const res = assignTasksToBlocks([task('light'), task('analytical'), task('admin')], blocks, 1, 'morning')
    const peak = res.find(b => b.peak)!
    expect(peak.tasks.some(t => t.type === 'analytical')).toBe(true)
  })
  it('concentrates heavy work into the peak block at survival energy', () => {
    const res = assignTasksToBlocks([task('analytical'), task('creative'), task('learning')], blocks, 5, 'morning')
    const peak = res.find(b => b.peak)!
    expect(peak.tasks.some(t => t.type === 'analytical')).toBe(true)
  })
  it('honors a manual block_index pin', () => {
    const pinned: Task = { ...task('analytical'), block_index: 3 }
    const res = assignTasksToBlocks([pinned], blocks, 1, 'morning')
    expect(res[3].tasks.some(t => t.type === 'analytical')).toBe(true)
  })
  it('produces different placement at energy 1 vs 5', () => {
    const tasks = [task('analytical'), task('light'), task('admin'), task('communication')]
    expect(sig(assignTasksToBlocks(tasks, blocks, 1, 'morning')))
      .not.toBe(sig(assignTasksToBlocks(tasks, blocks, 5, 'morning')))
  })
  it('marks exactly one peak block', () => {
    const res = assignTasksToBlocks([task('light')], blocks, 3, 'evening')
    expect(res.filter(b => b.peak)).toHaveLength(1)
    expect(res[3].peak).toBe(true) // evening peak = last block
  })
})

describe('capacity & heavy', () => {
  it('capacity decreases as energy worsens', () => {
    expect(capacity(1)).toBeGreaterThan(capacity(5))
  })
  it('flags heavy vs light task types', () => {
    expect(isHeavy(task('analytical'))).toBe(true)
    expect(isHeavy(task('light'))).toBe(false)
  })
  it('countHeavy counts only demand >= 0.7', () => {
    expect(countHeavy([])).toBe(0)
    // analytical(1.0), planning(0.7) heavy; admin(0.35), light(0.3) not.
    expect(countHeavy([task('analytical'), task('planning'), task('admin'), task('light')])).toBe(2)
  })
})

describe('blockEnergyCurve', () => {
  it('orients the curve by chronotype', () => {
    const m = blockEnergyCurve('morning')
    const e = blockEnergyCurve('evening')
    expect(m).toHaveLength(4)
    expect(m[0]).toBeGreaterThan(m[3]) // morning front-loaded
    expect(e[3]).toBeGreaterThan(e[0]) // evening back-loaded
    expect(blockEnergyCurve('midday')[1]).toBe(Math.max(...blockEnergyCurve('midday'))) // peak midday
  })
  it('falls back to the flat mixed curve for an unknown rhythm', () => {
    expect(blockEnergyCurve('weird' as unknown as Rhythm)).toEqual([0.7, 0.8, 0.7, 0.6])
  })
})

describe('assignTasksToBlocks edge cases', () => {
  it('handles an empty task list (4 blocks, one peak, no rationale)', () => {
    const blocks = calcBlocks('08:00', '23:00', 'mixed')
    const res = assignTasksToBlocks([], blocks, 3, 'mixed')
    expect(res).toHaveLength(4)
    expect(res.every(b => b.tasks.length === 0)).toBe(true)
    expect(res.filter(b => b.peak)).toHaveLength(1)
    expect(res.every(b => b.rationale === '')).toBe(true)
  })
})

describe('energy labels', () => {
  it('energyLabel maps 1..5 and empties out-of-range', () => {
    expect(energyLabel(1)).toBe(ENERGY_LABELS[1])
    expect(energyLabel(5)).toBe(ENERGY_LABELS[5])
    expect(energyLabel(0)).toBe('')
    expect(energyLabel(6)).toBe('')
  })
  it('energyLevelFromLabel round-trips every level', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      expect(energyLevelFromLabel(energyLabel(lvl))).toBe(lvl)
    }
  })
  it('energyLevelFromLabel returns null for missing/unknown labels', () => {
    expect(energyLevelFromLabel(null)).toBeNull()
    expect(energyLevelFromLabel(undefined)).toBeNull()
    expect(energyLevelFromLabel('🦄 nepostojeće')).toBeNull()
  })
})

describe('sleepQuality boundaries', () => {
  it('maps hours to the right band at each threshold', () => {
    expect(sleepQuality(8)).toBe('😴 Odlično spavanje')
    expect(sleepQuality(7.9)).toBe('👍 Dobro spavanje')
    expect(sleepQuality(7)).toBe('👍 Dobro spavanje')
    expect(sleepQuality(6)).toBe('😐 Solidno')
    expect(sleepQuality(5.9)).toBe('🥱 Malo manje od idealnog')
    expect(sleepQuality(5)).toBe('🥱 Malo manje od idealnog')
    expect(sleepQuality(4.9)).toBe('😩 Nedovoljno sna')
  })
})

describe('dayKey timezone (Europe/Belgrade)', () => {
  it('rolls to the next day at the Belgrade midnight boundary (winter, UTC+1)', () => {
    expect(dayKey(new Date('2024-01-01T22:59:00Z'))).toBe('2024-01-01') // 23:59 Belgrade
    expect(dayKey(new Date('2024-01-01T23:00:00Z'))).toBe('2024-01-02') // 00:00 Belgrade next day
  })
  it('respects DST (summer, UTC+2)', () => {
    expect(dayKey(new Date('2024-07-01T21:59:00Z'))).toBe('2024-07-01') // 23:59 Belgrade
    expect(dayKey(new Date('2024-07-01T22:00:00Z'))).toBe('2024-07-02') // 00:00 Belgrade next day
  })
  it('tomorrowKey is addDays(todayKey(), 1)', () => {
    expect(tomorrowKey()).toBe(addDays(todayKey(), 1))
  })
})

describe('date validation', () => {
  it('rejects impossible dates', () => {
    expect(isValidDayKey('2024-13-45')).toBe(false)
    expect(isValidDayKey('2024-02-30')).toBe(false)
    expect(isValidDayKey('nope')).toBe(false)
  })
  it('accepts a valid date and crosses month on addDays', () => {
    expect(isValidDayKey('2024-06-24')).toBe(true)
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
  })
})

describe('sleep hours', () => {
  it('computes duration across midnight', () => {
    expect(calcSleepHours('23:00', '07:00')).toBe(8)
  })
})
