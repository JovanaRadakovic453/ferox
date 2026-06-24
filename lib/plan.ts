import type { Task, TaskType, Rhythm, PlanBlock, Priority } from '@/types/ferox'
import type { TimeBlock } from '@/lib/energy'

/**
 * The energy-adaptive engine. PURE functions (testable) that make the day's
 * selected energy + the user's chronotype actually shape where work lands —
 * the product's reason to exist. Canonical energy_level: 1 = best … 5 = survival.
 */

// How much energy each task TYPE demands (0..1, higher = heavier).
export const typeEnergyDemand: Record<TaskType, number> = {
  analytical: 1.0,
  creative: 0.9,
  learning: 0.85,
  planning: 0.7,
  exercise: 0.65,
  meetings: 0.6,
  reading: 0.5,
  communication: 0.4,
  admin: 0.35,
  light: 0.3,
  rest: 0.1,
  meditation: 0.1,
}

// Restorative types belong in valleys (low-energy windows), never the peak.
const RESTORATIVE: ReadonlySet<TaskType> = new Set<TaskType>(['rest', 'meditation'])

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

const HEAVY_THRESHOLD = 0.7

/** Energy availability curve across the 4 blocks (morning→evening), 0..1, by chronotype. */
export function blockEnergyCurve(rhythm: Rhythm): number[] {
  switch (rhythm) {
    case 'morning': return [1.0, 0.8, 0.5, 0.3]
    case 'evening': return [0.3, 0.5, 0.8, 1.0]
    case 'midday':  return [0.6, 1.0, 0.8, 0.4]
    default:        return [0.7, 0.8, 0.7, 0.6] // mixed
  }
}

/** Today's overall capacity multiplier: level 1 (Pun gas) → 1.0, level 5 (Preživljavam) → 0.2. */
export function dailyFactor(level: number | null | undefined): number {
  const l = level && level >= 1 && level <= 5 ? level : 3
  return (6 - l) / 5
}

/** Recommended max number of heavy tasks for a given daily energy level. */
export function capacity(level: number | null | undefined): number {
  const l = level && level >= 1 && level <= 5 ? level : 3
  return ({ 1: 6, 2: 5, 3: 4, 4: 3, 5: 2 } as Record<number, number>)[l] ?? 4
}

export function isHeavy(t: Task): boolean {
  return (typeEnergyDemand[t.type] ?? 0.3) >= HEAVY_THRESHOLD
}

export function countHeavy(tasks: Task[]): number {
  return tasks.filter(isHeavy).length
}

/**
 * Greedy energy-fit assignment. Honors manual placement (block_index) first, then
 * places the rest heaviest-first into the block whose available energy best matches
 * the task's demand — concentrating heavy work into the peak block when daily energy is low.
 */
export function assignTasksToBlocks(
  tasks: Task[],
  blocks: TimeBlock[],
  energyLevel: number | null | undefined,
  rhythm: Rhythm,
): PlanBlock[] {
  const n = blocks.length
  const curve = blockEnergyCurve(rhythm)
  const f = dailyFactor(energyLevel)
  const effective = curve.map(c => c * f)
  const peakIdx = curve.reduce((best, c, i) => (c > curve[best] ? i : best), 0)

  const buckets: Task[][] = blocks.map(() => [])
  const auto: Task[] = []

  // 1) Manual placements land exactly where the user put them.
  for (const t of tasks) {
    if (typeof t.block_index === 'number' && t.block_index >= 0 && t.block_index < n) {
      buckets[t.block_index].push(t)
    } else {
      auto.push(t)
    }
  }

  // 2) Heaviest first, priority as tiebreaker.
  const sorted = [...auto].sort((a, b) => {
    const da = typeEnergyDemand[a.type] ?? 0.3
    const db = typeEnergyDemand[b.type] ?? 0.3
    if (db !== da) return db - da
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  })

  const targetPerBlock = Math.ceil(tasks.length / n)

  for (const t of sorted) {
    const restorative = RESTORATIVE.has(t.type)
    const demand = typeEnergyDemand[t.type] ?? 0.3
    let bestI = 0
    let bestScore = -Infinity
    for (let i = 0; i < n; i++) {
      // Restorative → lowest-energy block; everything else → closest energy fit.
      const fit = restorative ? -effective[i] : -Math.abs(demand - effective[i])
      const fullnessPenalty = buckets[i].length >= targetPerBlock ? 0.35 : 0
      const score = fit - fullnessPenalty
      if (score > bestScore) { bestScore = score; bestI = i }
    }
    buckets[bestI].push(t)
  }

  return blocks.map((b, i) => ({
    label: b.label,
    badge: b.color,
    badgeText: b.emoji,
    timeRange: b.timeRange,
    tasks: buckets[i],
    peak: i === peakIdx,
    rationale: blockRationale(i, peakIdx, effective[i], buckets[i]),
  }))
}

function blockRationale(i: number, peakIdx: number, eff: number, tasks: Task[]): string {
  if (tasks.length === 0) return ''
  if (i === peakIdx) return 'Tvoj najjači prozor — težak posao ide ovde'
  const avg = tasks.reduce((s, t) => s + (typeEnergyDemand[t.type] ?? 0.3), 0) / tasks.length
  if (avg <= 0.2) return 'Vreme za predah'
  if (eff <= 0.45) return 'Lakša zona — komunikacija i admin'
  return 'Balansiran deo dana'
}
