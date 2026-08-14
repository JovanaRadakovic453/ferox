// Na kojim danima se zakazan zadatak VIDI u kalendaru.
//
// Zakazan zadatak je POČETAK rada, ne jedini dan: projekat se radi više dana pre
// roka. Zato se u kalendaru prikazuje na svakom danu od početka do roka — da se
// vidi da ti tih dana "zauzima" mesto.
//
// Dva namerna ograničenja:
//  • bez roka → samo dan početka. Inače bi se zadatak bez roka razvukao kroz
//    kalendar unedogled i zatrpao ga.
//  • pojavljivanje serije koja se ponavlja → samo svoj dan. Propušten utorak ne
//    sme da se razlije po sredi i četvrtku.
//
// Ovo je čisto PRIKAZ — ne pravi nove redove u bazi.

export type SpannableTask = {
  for_date: string
  deadline_date?: string | null
  repeat_id?: string | null
}

/** Da li se zadatak vidi na dan `day`. */
export function showsOnDay(task: SpannableTask, day: string): boolean {
  if (task.for_date === day) return true
  if (task.repeat_id) return false
  if (!task.deadline_date) return false
  return day > task.for_date && day <= task.deadline_date
}

/** Zadaci vidljivi na dan `day`. */
export function scheduledOnDay<T extends SpannableTask>(tasks: T[], day: string): T[] {
  return tasks.filter(t => showsOnDay(t, day))
}

/**
 * Propušten zakazan zadatak: njegov dan (ili rok) je prošao, a nije odrađen.
 *
 * Zašto postoji: zadatak bez roka „živi" samo na svom danu (`showsOnDay`). Kad
 * taj dan prođe a plan tog dana nije napravljen, zadatak nigde više ne iskoči —
 * tiho nestane. Ovim ga hvatamo da bi ga „danas" ponovo ponudili.
 *
 *  • serija → nikad (propušteno pojavljivanje se ne gomila — isto pravilo kao showsOnDay).
 *  • ima rok → propušten tek kad i rok prođe (do tada se vidi kroz `showsOnDay`).
 *  • bez roka → propušten čim mu dan prođe.
 */
export function isOverdue(task: SpannableTask, today: string): boolean {
  if (task.repeat_id) return false
  const lastDay = task.deadline_date ?? task.for_date
  return lastDay < today
}

/** Propušteni zakazani zadaci (za ponovno nuđenje „danas"). Podrazumeva done=false (filtrira upit). */
export function overdueScheduled<T extends SpannableTask>(tasks: T[], today: string): T[] {
  return tasks.filter(t => isOverdue(t, today))
}

/** Svi dani na kojima se bar jedan zadatak vidi — za tačkice u mreži kalendara. */
export function scheduledDateSet(tasks: SpannableTask[]): Set<string> {
  const out = new Set<string>()
  for (const t of tasks) {
    out.add(t.for_date)
    if (t.repeat_id || !t.deadline_date) continue
    // Razvuci do roka. Granica je već u bazi (rok ne može biti pre početka), ali
    // brojač je tu i kao zaštita da petlja ne odbegne na neispravnom podatku.
    let cursor = t.for_date
    for (let i = 0; i < 400 && cursor < t.deadline_date; i++) {
      const [y, m, d] = cursor.split('-').map(Number)
      const next = new Date(Date.UTC(y, m - 1, d + 1))
      cursor = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
      out.add(cursor)
    }
  }
  return out
}
