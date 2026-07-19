import { describe, it, expect } from 'vitest'
import {
  mergeOp, pendingTasks, pendingAppts, pendingDone, pendingDeleted, newId, fallbackId, flushQueue,
  type PendingOp, type TaskRow,
} from '@/lib/offlineQueue'

const task = (id: string, done = false): TaskRow => ({
  id, entry_id: 'e1', user_id: 'u1', name: `Zadatak ${id}`,
  done, priority: 'medium', type: 'light', note: '', position: 0,
})

describe('mergeOp — štikliranje', () => {
  it('prvi klik ulazi u red', () => {
    expect(mergeOp([], { kind: 'toggle', taskId: 'a', done: true }))
      .toEqual([{ kind: 'toggle', taskId: 'a', done: true }])
  })

  it('štikliraj pa odštikliraj isti zadatak → ostaje SAMO konačno stanje', () => {
    let q: PendingOp[] = []
    for (const v of [true, false, true, false, true]) q = mergeOp(q, { kind: 'toggle', taskId: 'a', done: v })
    expect(q).toHaveLength(1)
    expect(q[0]).toEqual({ kind: 'toggle', taskId: 'a', done: true })
  })

  it('ne dira druge zadatke kad se jedan menja', () => {
    let q = mergeOp([], { kind: 'toggle', taskId: 'a', done: true })
    q = mergeOp(q, { kind: 'toggle', taskId: 'b', done: true })
    q = mergeOp(q, { kind: 'toggle', taskId: 'a', done: false })
    expect(q).toHaveLength(2)
    expect(q.find(o => o.kind === 'toggle' && o.taskId === 'b')).toBeTruthy()
  })
})

describe('mergeOp — dodavanje', () => {
  it('dodavanja se NIKAD ne sažimaju (dva zadatka ostaju dva)', () => {
    let q = mergeOp([], { kind: 'addTask', row: task('t1') })
    q = mergeOp(q, { kind: 'addTask', row: task('t2') })
    expect(q).toHaveLength(2)
  })

  it('redosled se poštuje: dodaj pa štikliraj → prvo upis, pa štikliranje', () => {
    let q = mergeOp([], { kind: 'addTask', row: task('t1') })
    q = mergeOp(q, { kind: 'toggle', taskId: 't1', done: true })
    expect(q[0].kind).toBe('addTask')
    expect(q[1].kind).toBe('toggle')
  })
})

describe('šta se vidi na ekranu dok čeka', () => {
  const q: PendingOp[] = [
    { kind: 'addTask', row: task('t1') },
    { kind: 'addTask', row: { ...task('t2'), entry_id: 'DRUGI_DAN' } },
    { kind: 'addAppt', row: { id: 'a1', user_id: 'u1', date_key: '2026-07-20', name: 'Zubar', time: '11:00', reminder: 15, done: false } },
    { kind: 'toggle', taskId: 't1', done: true },
  ]

  it('vraća samo zadatke za TAJ dan', () => {
    expect(pendingTasks(q, 'e1').map(r => r.id)).toEqual(['t1'])
  })

  it('vraća samo termine za TAJ datum', () => {
    expect(pendingAppts(q, '2026-07-20').map(r => r.id)).toEqual(['a1'])
    expect(pendingAppts(q, '2026-07-21')).toEqual([])
  })

  it('zadatak dodat pa štikliran offline prikazuje se kao završen', () => {
    expect(pendingDone(q).get('t1')).toBe(true)
  })
})

describe('mergeOp — brisanje čisti red', () => {
  it('zadatak nastao offline pa obrisan → red ostaje PRAZAN (nikad nije ni stigao na server)', () => {
    let q = mergeOp([], { kind: 'addTask', row: task('t1') })
    q = mergeOp(q, { kind: 'toggle', taskId: 't1', done: true })
    q = mergeOp(q, { kind: 'deleteTask', taskId: 't1' })
    expect(q).toEqual([])
  })

  it('zadatak sa servera obrisan → ostaje samo brisanje, bez suvišnog štikliranja', () => {
    let q = mergeOp([], { kind: 'toggle', taskId: 'server-1', done: true })
    q = mergeOp(q, { kind: 'deleteTask', taskId: 'server-1' })
    expect(q).toEqual([{ kind: 'deleteTask', taskId: 'server-1' }])
  })

  it('brisanje jednog ne dira druge', () => {
    let q = mergeOp([], { kind: 'addTask', row: task('t1') })
    q = mergeOp(q, { kind: 'addTask', row: task('t2') })
    q = mergeOp(q, { kind: 'deleteTask', taskId: 't1' })
    expect(q).toHaveLength(1)
    expect(q[0].kind === 'addTask' && q[0].row.id).toBe('t2')
  })
})

describe('mergeOp — štikliranje termina', () => {
  it('poslednje stanje pobeđuje, kao i kod zadataka', () => {
    let q: PendingOp[] = []
    for (const v of [true, false, true]) q = mergeOp(q, { kind: 'toggleAppt', apptId: 'a1', done: v })
    expect(q).toEqual([{ kind: 'toggleAppt', apptId: 'a1', done: true }])
  })

  it('termin i zadatak sa istim potezom se ne mešaju', () => {
    let q = mergeOp([], { kind: 'toggle', taskId: 'x', done: true })
    q = mergeOp(q, { kind: 'toggleAppt', apptId: 'x2', done: true })
    expect(q).toHaveLength(2)
  })
})

describe('pendingDeleted', () => {
  it('obrisano offline se ne vraća na ekran', () => {
    const q: PendingOp[] = [{ kind: 'deleteTask', taskId: 'd1' }, { kind: 'addTask', row: task('t9') }]
    expect([...pendingDeleted(q)]).toEqual(['d1'])
  })
})

describe('newId', () => {
  it('pravi jedinstvene id-jeve (zato je ponovno slanje bezopasno)', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()))
    expect(ids.size).toBe(50)
  })
})

describe('fallbackId', () => {
  it('ima važeći uuid v4 oblik (kolone id u bazi su tipa uuid)', () => {
    const rx = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    for (let i = 0; i < 20; i++) expect(fallbackId()).toMatch(rx)
  })
})

describe('flushQueue — redosled i zaustavljanje', () => {
  const q: PendingOp[] = [
    { kind: 'addTask', row: task('t1') },
    { kind: 'toggle', taskId: 't1', done: true },
    { kind: 'toggleAppt', apptId: 'a1', done: true },
  ]

  it('kad sve prođe → red je prazan', async () => {
    const seen: string[] = []
    const stuck = await flushQueue(q, async op => { seen.push(op.kind); return true })
    expect(stuck).toEqual([])
    expect(seen).toEqual(['addTask', 'toggle', 'toggleAppt'])
  })

  it('na prvoj grešci STAJE — pali potez i SVI posle njega ostaju (kvačica se ne gubi)', async () => {
    const seen: string[] = []
    const stuck = await flushQueue(q, async op => { seen.push(op.kind); return op.kind !== 'addTask' })
    // addTask pao → toggle (i sve posle) NE SME ni da se pokuša, ostaje u redu
    expect(seen).toEqual(['addTask'])
    expect(stuck).toEqual(q)
  })

  it('izuzetak u slanju se računa kao neuspeh, ne ruši red', async () => {
    const stuck = await flushQueue(q, async op => {
      if (op.kind === 'toggle') throw new Error('mreža pukla')
      return true
    })
    expect(stuck).toEqual(q.slice(1))
  })
})
