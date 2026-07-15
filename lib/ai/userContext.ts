// Kontekst za brain dump koji se ubaci u AI prompt. Dve svrhe:
//  1) UČENJE PRIORITETA — AI vidi kako je korisnik ranije određivao prioritet
//     (koje zadatke je slao na visok/srednji/nizak) pa po tome predlaže. Krug
//     učenja se sam zatvara: kad korisnik u predlogu ispravi prioritet, ta
//     ispravka se sačuva na zadatku i sledeći put uđe u ovaj sažetak.
//  2) 1-3-5 — koliko je već zakazano po danima, da AI ne pretrpa dan.
// Pure funkcije (summarizePriorityHistory, formatScheduledLoad) su izdvojene da
// budu testabilne bez baze.

import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, todayKey } from '@/lib/date'
import { AI } from '@/lib/config'

type TaskLite = { name: string; priority: string }

// Koliko skorijih zadataka gledamo i koliko primera po prioritetu prikazujemo.
const HISTORY_LOOKBACK = 120
const EXAMPLES_PER_PRIORITY = 6

const PRIORITY_LABEL: Record<string, string> = { high: 'visok', medium: 'srednji', low: 'nizak' }

/** Sažetak "kako korisnik obično određuje prioritet" — po nivou par primera. */
export function summarizePriorityHistory(tasks: TaskLite[]): string {
  if (tasks.length === 0) return ''

  const byPriority = new Map<string, string[]>()
  for (const t of tasks) {
    const p = t.priority
    if (!PRIORITY_LABEL[p]) continue
    const name = t.name.trim()
    if (!name) continue
    const names = byPriority.get(p) ?? []
    if (names.length < EXAMPLES_PER_PRIORITY && !names.includes(name)) names.push(name)
    byPriority.set(p, names)
  }

  const lines: string[] = []
  for (const p of ['high', 'medium', 'low']) {
    const names = byPriority.get(p)
    if (names && names.length > 0) {
      lines.push(`- ${PRIORITY_LABEL[p]}: ${names.map(n => `"${n}"`).join(', ')}`)
    }
  }
  if (lines.length === 0) return ''
  return `Kako korisnik obično određuje prioritet (uči iz ovoga kad predlažeš prioritet za slične zadatke):\n${lines.join('\n')}`
}

// Nazivi dana (getUTCDay: 0=nedelja … 6=subota). Sidrimo na podne UTC da granica
// ponoći ne pomeri dan.
const WEEKDAYS_SR = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota']
export function weekdayName(key: string): string {
  return WEEKDAYS_SR[new Date(`${key}T12:00:00Z`).getUTCDay()]
}

/** Mapa dan-u-nedelji → dayOffset + opterećenje, da AI tačno mapira "u četvrtak". */
export function formatScheduledLoad(counts: Record<string, number>, horizonDays: number): string {
  const today = todayKey()
  const lines: string[] = []
  for (let i = 0; i < horizonDays; i++) {
    const key = addDays(today, i)
    const label = i === 0 ? 'danas' : i === 1 ? 'sutra' : `za ${i} dana`
    lines.push(`- dayOffset ${i} = ${weekdayName(key)} (${label}, ${key}): već ${counts[key] ?? 0} zakazano`)
  }
  return `Dani u horizontu (kad korisnik pomene dan u nedelji, npr. "u četvrtak", koristi TAČAN dayOffset za taj dan; uzmi u obzir opterećenje da ne pretrpaš dan):\n${lines.join('\n')}`
}

/**
 * Skupi kontekst za brain dump: sažetak prioriteta iz istorije + postojeće
 * opterećenje po danima. Vraća gotov tekst za ubacivanje u prompt.
 */
export async function buildBrainDumpContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ contextText: string }> {
  const horizon = AI.brainDumpHorizonDays
  const today = todayKey()
  const horizonEnd = addDays(today, horizon - 1)

  const [tasksRes, schedRes, loadRes] = await Promise.all([
    supabase.from('tasks').select('name, priority').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(HISTORY_LOOKBACK),
    supabase.from('scheduled_tasks').select('name, priority').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(HISTORY_LOOKBACK),
    supabase.from('scheduled_tasks').select('for_date').eq('user_id', userId)
      .eq('done', false).gte('for_date', today).lte('for_date', horizonEnd),
  ])

  const history = [
    ...((tasksRes.data ?? []) as TaskLite[]),
    ...((schedRes.data ?? []) as TaskLite[]),
  ]

  const counts: Record<string, number> = {}
  for (const row of (loadRes.data ?? []) as { for_date: string }[]) {
    counts[row.for_date] = (counts[row.for_date] ?? 0) + 1
  }

  const contextText = [
    summarizePriorityHistory(history),
    formatScheduledLoad(counts, horizon),
  ].filter(Boolean).join('\n\n')

  return { contextText }
}
