import { describe, it, expect } from 'vitest'
import { computeStreak } from '@/lib/streak'

// Reference week (weekday from `${d}T12:00:00Z` getUTCDay):
//   2024-06-10 Mon(1)  -11 Tue(2)  -12 Wed(3)  -13 Thu(4)  -14 Fri(5)  -15 Sat(6)  -16 Sun(0)

describe('computeStreak', () => {
  it('counts consecutive finished days back from today', () => {
    const finished = new Set(['2024-06-10', '2024-06-11', '2024-06-12'])
    expect(computeStreak(finished, [], '2024-06-12')).toBe(3)
  })

  it('does not break when today itself is not finished yet', () => {
    const finished = new Set(['2024-06-10', '2024-06-11'])
    expect(computeStreak(finished, [], '2024-06-12')).toBe(2)
  })

  it('skips rest days without breaking the streak', () => {
    // Saturday (6) is a rest day and is NOT finished, but must not break the run.
    const finished = new Set(['2024-06-13', '2024-06-14', '2024-06-16']) // Thu, Fri, Sun
    expect(computeStreak(finished, [6], '2024-06-16')).toBe(3)
  })

  it('breaks on a non-rest unfinished gap', () => {
    const finished = new Set(['2024-06-12', '2024-06-10']) // missing Tue 6-11
    expect(computeStreak(finished, [], '2024-06-12')).toBe(1)
  })

  it('is zero when nothing is finished', () => {
    expect(computeStreak(new Set(), [], '2024-06-12')).toBe(0)
  })
})
