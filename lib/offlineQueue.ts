// Red čekanja za štikliranje bez interneta.
//
// Bez ovoga bi klik u metrou tiho propao: optimistički UI pokaže kvačicu, upis u
// bazu padne, i posle osvežavanja zadatak je opet neurađen. Zato se izmena upiše
// lokalno i pošalje čim se mreža vrati.
//
// Namerno pokriva SAMO štikliranje zadataka — to je jedino što se radi u pokretu.
// Pravljenje plana, AI i Kalendar i dalje traže internet (i to se korisniku kaže).

const KEY = 'ferox-pending-toggles'

export type PendingToggle = {
  taskId: string
  done: boolean
  /** Veza ka zakazanom zadatku — da se i bez mreže original pravilno zatvori. */
  scheduledId?: string | null
}

/**
 * Poslednje stanje pobeđuje: ako korisnik štiklira pa odštiklira isti zadatak,
 * u red ide samo konačno stanje — ne dva suprotna upisa.
 */
export function mergeToggle(queue: PendingToggle[], item: PendingToggle): PendingToggle[] {
  const rest = queue.filter(q => q.taskId !== item.taskId)
  return [...rest, item]
}

export function readQueue(): PendingToggle[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingToggle[]) : []
  } catch {
    return [] // localStorage nedostupan ili smeće u njemu — radi bez reda čekanja
  }
}

export function writeQueue(queue: PendingToggle[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(queue))
  } catch { /* ignore */ }
}

export function enqueueToggle(item: PendingToggle): void {
  writeQueue(mergeToggle(readQueue(), item))
}

/** `navigator.onLine` je samo nagoveštaj — ali dovoljno dobar da ne čekamo timeout. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
