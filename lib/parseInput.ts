// Prepoznavanje običnog srpskog teksta pri unosu:
//   "sutra u 17h kod zubara" → termin, sutra, 17:00, "Kod zubara"
//   "hitno poslati izveštaj" → zadatak, danas, visok prioritet
//
// NAMERNO bez AI-ja: ovo su pravila, pa je unos trenutan, besplatan i radi
// bez interneta. (Todoist, po kome je ovo najhvaljenije, takođe koristi pravila.)
//
// Zadaci u Feroxu nemaju vreme, termini imaju — zato: ako nađemo sat → termin.

import { todayKey, addDays } from '@/lib/date'
import type { Priority } from '@/types/ferox'

export type ParsedInput = {
  /** Naziv koji ostane kad se izbaci sve prepoznato. */
  name: string
  dateKey: string
  /** "HH:MM" ako je nađeno vreme, inače null. */
  time: string | null
  priority: Priority
  kind: 'task' | 'appointment'
  /** Šta je prepoznato — koristi se da se korisniku pokaže šta je app razumela. */
  matched: string[]
}

// Radimo nad tekstom ograđenim razmacima i gledamo razmak levo/desno umesto \b:
// \b je ASCII, pa "četvrtak" (počinje na č) ne bi prošao granicu reči.
const wrap = (p: string) => new RegExp(`(?<=\\s)(?:${p})(?=\\s)`, 'i')

const DAYS: Array<[string, number]> = [
  ['(?:u )?ponedelj(?:ak|ka)', 1],
  ['(?:u )?utor(?:ak|ka)', 2],
  ['(?:u )?sred[au]', 3],
  ['(?:u )?[čc]etvrt(?:ak|ka)', 4],
  ['(?:u )?pet(?:ak|ka)', 5],
  ['(?:u )?subot[au]', 6],
  ['(?:u )?nedelj[au]', 0],
]

/** Prvi naredni takav dan u nedelji; ako je danas taj dan → sledeća nedelja. */
function nextDow(today: string, dow: number): string {
  const cur = new Date(`${today}T12:00:00Z`).getUTCDay()
  const delta = (dow - cur + 7) % 7 || 7
  return addDays(today, delta)
}

export function parseInput(raw: string): ParsedInput {
  const today = todayKey()
  // Interpunkciju brišemo, ali NE između cifara — da "17:30" preživi.
  let text = ' ' + raw.replace(/(?<!\d)[.,;:!?](?!\d)/g, ' ').replace(/\s+/g, ' ').trim() + ' '

  const matched: string[] = []
  let dateKey = today
  let time: string | null = null
  let priority: Priority = 'medium'

  // `guard` validira pogodak PRE nego što se izbaci iz teksta — nevažeći
  // pogodak (npr. "u 99h") ostaje u nazivu umesto da se tiho proguta.
  function eat(pattern: string, label: string, guard?: (m: RegExpMatchArray) => boolean): RegExpMatchArray | null {
    const rx = wrap(pattern)
    const m = text.match(rx)
    if (!m || (guard && !guard(m))) return null
    text = text.replace(rx, ' ')
    if (!matched.includes(label)) matched.push(label)
    return m
  }

  // 1) Prioritet — "nije hitno" mora pre "hitno" (inače bi "hitno" pojelo deo).
  if (eat('nije hitno|kad stignem|nebitno|mo[žz]e [čc]ekati', 'prioritet')) priority = 'low'
  else if (eat('hitno|hitan|hitna|va[žz]no|urgentno', 'prioritet')) priority = 'high'

  // 2) Dan — "za nedelju dana" pre dana u nedelji (inače "nedelju" = nedelja).
  let m: RegExpMatchArray | null
  if (eat('za nedelju dana', 'dan')) {
    dateKey = addDays(today, 7)
  } else if ((m = eat('za (\\d{1,2}) dan[ai]?', 'dan'))) {
    dateKey = addDays(today, Number(m[1]))
  } else if (eat('prekosutra', 'dan')) {
    dateKey = addDays(today, 2)
  } else if (eat('sutra', 'dan')) {
    dateKey = addDays(today, 1)
  } else if (eat('danas', 'dan')) {
    dateKey = today
  } else {
    for (const [p, dow] of DAYS) {
      if (eat(p, 'dan')) { dateKey = nextDow(today, dow); break }
    }
  }

  // 3) Vreme — tek posle dana, da "za 3 dana" ne bude protumačeno kao 3 sata.
  const validTime = (mt: RegExpMatchArray) => Number(mt[1]) <= 23 && (!mt[2] || Number(mt[2]) <= 59)
  m = eat('u (\\d{1,2})(?::(\\d{2}))? ?(?:h|[čc]|sati|[čc]asova)?', 'vreme', validTime)
    ?? eat('(\\d{1,2})(?::(\\d{2}))? ?(?:h|sati|[čc]asova)', 'vreme', validTime)
  if (m) {
    time = `${String(Number(m[1])).padStart(2, '0')}:${String(m[2] ? Number(m[2]) : 0).padStart(2, '0')}`
  }

  const rest = text.replace(/\s+/g, ' ').trim()
  const name = rest ? rest[0].toUpperCase() + rest.slice(1) : ''

  return { name, dateKey, time, priority, kind: time ? 'appointment' : 'task', matched }
}
