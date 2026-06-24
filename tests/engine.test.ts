import { describe, it, expect } from 'vitest'
import { calcBlocks } from '@/lib/energy'
import { assignTasksToBlocks, capacity, isHeavy } from '@/lib/plan'
import { isValidDayKey, addDays } from '@/lib/date'
import { calcSleepHours } from '@/lib/utils'
import type { Task, TaskType } from '@/types/ferox'

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
