import { describe, it, expect } from 'vitest'
import { mergeToggle, type PendingToggle } from '@/lib/offlineQueue'

describe('mergeToggle — red čekanja bez interneta', () => {
  it('prvi klik ulazi u red', () => {
    expect(mergeToggle([], { taskId: 'a', done: true })).toEqual([{ taskId: 'a', done: true }])
  })

  it('različiti zadaci se skupljaju', () => {
    const q = mergeToggle(mergeToggle([], { taskId: 'a', done: true }), { taskId: 'b', done: true })
    expect(q).toEqual([{ taskId: 'a', done: true }, { taskId: 'b', done: true }])
  })

  it('štikliraj pa odštikliraj isti zadatak → ostaje SAMO konačno stanje', () => {
    const q = mergeToggle(mergeToggle([], { taskId: 'a', done: true }), { taskId: 'a', done: false })
    expect(q).toEqual([{ taskId: 'a', done: false }])
  })

  it('vraćanje na početno stanje ne ostavlja dva suprotna upisa', () => {
    let q: PendingToggle[] = []
    for (const v of [true, false, true, false, true]) q = mergeToggle(q, { taskId: 'a', done: v })
    expect(q).toHaveLength(1)
    expect(q[0].done).toBe(true)
  })

  it('ne dira druge zadatke kad se jedan menja', () => {
    let q = mergeToggle([], { taskId: 'a', done: true })
    q = mergeToggle(q, { taskId: 'b', done: true })
    q = mergeToggle(q, { taskId: 'a', done: false })
    expect(q.find(x => x.taskId === 'b')?.done).toBe(true)
    expect(q.find(x => x.taskId === 'a')?.done).toBe(false)
  })
})
