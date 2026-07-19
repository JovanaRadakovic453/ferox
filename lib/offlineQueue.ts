// Red čekanja za izmene napravljene bez interneta.
//
// Bez ovoga bi klik u metrou tiho propao: optimistički UI pokaže promenu, upis u
// bazu padne, i posle osvežavanja je kao da se ništa nije desilo.
//
// KLJUČNI TRIK — id pravi APLIKACIJA, ne baza. Novi zadatak dobija svoj broj još
// dok si offline, pa je ponovno slanje bezopasno: baza vidi isti broj i ne napravi
// duplikat (zato se pri slanju koristi `upsert`, ne `insert`). Bez toga bi loša
// mreža ili dva otvorena prozora umnožavali zadatke — gore nego da offline ne radi.
//
// Redosled se POŠTUJE: zadatak dodat pa štikliran offline prvo se upiše, pa onda
// štiklira. Zato se novi potez uvek dodaje na kraj reda.

const KEY = 'ferox-pending-ops'

export type TaskRow = {
  id: string
  entry_id: string
  user_id: string
  name: string
  done: boolean
  priority: string
  type: string
  note: string
  position: number
}

export type ApptRow = {
  id: string
  user_id: string
  date_key: string
  name: string
  time: string
  reminder: number
  done: boolean
}

export type PendingOp =
  | { kind: 'toggle'; taskId: string; done: boolean; scheduledId?: string | null }
  | { kind: 'toggleAppt'; apptId: string; done: boolean }
  | { kind: 'addTask'; row: TaskRow }
  | { kind: 'addAppt'; row: ApptRow }
  | { kind: 'deleteTask'; taskId: string }

/** Da li se potez tiče baš tog zadatka (za čišćenje pri brisanju). */
function touchesTask(op: PendingOp, taskId: string): boolean {
  if (op.kind === 'toggle' || op.kind === 'deleteTask') return op.taskId === taskId
  if (op.kind === 'addTask') return op.row.id === taskId
  return false
}

/**
 * Sažimanje reda čekanja:
 *  • štikliranje istog zadatka/termina → ostaje samo KONAČNO stanje (klik pa opoziv
 *    ne šalju dva suprotna upisa)
 *  • brisanje → briše sve ranije poteze nad tim zadatkom. Ako je zadatak i NASTAO
 *    offline, nikad nije stigao na server — pa nema ni šta da se briše: oba poteza
 *    se ponište i red ostaje čist.
 *  • dodavanja se nikad ne sažimaju
 */
export function mergeOp(queue: PendingOp[], op: PendingOp): PendingOp[] {
  if (op.kind === 'toggle') {
    return [...queue.filter(q => !(q.kind === 'toggle' && q.taskId === op.taskId)), op]
  }
  if (op.kind === 'toggleAppt') {
    return [...queue.filter(q => !(q.kind === 'toggleAppt' && q.apptId === op.apptId)), op]
  }
  if (op.kind === 'deleteTask') {
    const bornOffline = queue.some(q => q.kind === 'addTask' && q.row.id === op.taskId)
    const rest = queue.filter(q => !touchesTask(q, op.taskId))
    return bornOffline ? rest : [...rest, op]
  }
  return [...queue, op]
}

export function readQueue(): PendingOp[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingOp[]) : []
  } catch {
    return [] // localStorage nedostupan ili smeće u njemu — radi bez reda čekanja
  }
}

export function writeQueue(queue: PendingOp[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(queue))
  } catch { /* ignore */ }
}

export function enqueue(op: PendingOp): void {
  writeQueue(mergeOp(readQueue(), op))
}

/** Zadaci dodati offline — da se vide i posle zatvaranja aplikacije. */
export function pendingTasks(queue: PendingOp[], entryId: string): TaskRow[] {
  return queue
    .filter((o): o is Extract<PendingOp, { kind: 'addTask' }> => o.kind === 'addTask')
    .map(o => o.row)
    .filter(r => r.entry_id === entryId)
}

/** Termini dodati offline — isto. */
export function pendingAppts(queue: PendingOp[], dateKey: string): ApptRow[] {
  return queue
    .filter((o): o is Extract<PendingOp, { kind: 'addAppt' }> => o.kind === 'addAppt')
    .map(o => o.row)
    .filter(r => r.date_key === dateKey)
}

/**
 * Konačno stanje štikliranja iz reda — i za zadatke i za termine.
 * Jedna mapa je dovoljna jer su id-jevi jedinstveni kroz celu bazu.
 */
export function pendingDone(queue: PendingOp[]): Map<string, boolean> {
  const out = new Map<string, boolean>()
  for (const o of queue) {
    if (o.kind === 'toggle') out.set(o.taskId, o.done)
    if (o.kind === 'toggleAppt') out.set(o.apptId, o.done)
    if (o.kind === 'addTask') out.set(o.row.id, o.row.done)
    if (o.kind === 'addAppt') out.set(o.row.id, o.row.done)
  }
  return out
}

/**
 * Obrisano offline — server to još ne zna, pa bi se posle zatvaranja aplikacije
 * zadatak vratio na ekran kao da brisanje nije ni bilo.
 */
export function pendingDeleted(queue: PendingOp[]): Set<string> {
  return new Set(
    queue.filter((o): o is Extract<PendingOp, { kind: 'deleteTask' }> => o.kind === 'deleteTask')
      .map(o => o.taskId)
  )
}

/** Id koji pravi aplikacija — zato je ponovno slanje bezopasno. */
export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Stariji pregledači: dovoljno je da bude jedinstveno, ne kriptografski jako.
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
  }
}

/** `navigator.onLine` je samo nagoveštaj — ali dovoljno dobar da ne čekamo timeout. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
