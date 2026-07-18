import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateDayBody } from '@/lib/validation'
import type { Task } from '@/types/ferox'
import { DEFAULTS } from '@/lib/config'

export type CreateDayResult =
  | { ok: true; entryId: string; tasks: Task[] }
  | { ok: false; code: string; message: string; detail?: unknown }

/**
 * Single validated path that creates/updates a day_entry + its tasks + appointments.
 * Used by /api/day/create so every write goes through the same enum/validation
 * logic. Returns inserted tasks WITH ids.
 */
export async function createDay(
  supabase: SupabaseClient,
  userId: string,
  body: CreateDayBody,
): Promise<CreateDayResult> {
  const { dateKey, sleepHours, sleepTime, wakeTime, tasks, appointments } = body
  const sleep = sleepHours ?? null

  // 1. Find existing day_entry
  const { data: existing, error: findErr } = await supabase
    .from('day_entries').select('id').eq('user_id', userId).eq('date_key', dateKey).maybeSingle()
  if (findErr) return { ok: false, code: 'DB_FIND', message: 'Greška pri pretrazi dana', detail: findErr.message }

  let entryId: string
  if (existing) {
    entryId = existing.id
    // Reopen the day (finished_at:null) — non-destructive undo of "Završi dan" / edit flow.
    const { error: delErr } = await supabase.from('tasks').delete().eq('user_id', userId).eq('entry_id', entryId)
    if (delErr) return { ok: false, code: 'DB_DEL_TASKS', message: 'Greška pri brisanju starih zadataka', detail: delErr.message }
    const { error: upErr } = await supabase.from('day_entries')
      .update({ sleep_hours: sleep, finished_at: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId).eq('id', entryId)
    if (upErr) return { ok: false, code: 'DB_UPDATE_ENTRY', message: 'Greška pri ažuriranju dana', detail: upErr.message }
  } else {
    const { data: newEntry, error: insErr } = await supabase.from('day_entries')
      .insert({ user_id: userId, date_key: dateKey, sleep_hours: sleep })
      .select('id').single()
    if (insErr || !newEntry) return { ok: false, code: 'DB_INSERT_ENTRY', message: 'Greška pri kreiranju dana', detail: insErr?.message }
    entryId = newEntry.id
  }

  // 2. Tasks (validated enums by zod upstream)
  let inserted: Task[] = []
  const taskRows = tasks.map((t, i) => ({
    entry_id: entryId, user_id: userId, name: t.name, done: t.done ?? false,
    priority: t.priority, type: t.type, note: t.note ?? '',
    position: t.position ?? i, block_index: t.block_index ?? null,
    deadline_date: t.deadline_date ?? null,
    // Veza ka originalu iz Kalendara — po njoj se pri štikliranju zatvara zakazani
    // zadatak (migracija 0022).
    scheduled_id: t.scheduledId ?? null,
  }))
  if (taskRows.length > 0) {
    const { data, error } = await supabase.from('tasks').insert(taskRows)
      .select('id, name, done, priority, type, note, position, block_index, deadline_date, scheduled_id')
    if (error) return { ok: false, code: 'DB_INSERT_TASKS', message: 'Greška pri ubacivanju zadataka', detail: error.message }
    inserted = (data ?? []) as Task[]
    if (inserted.length !== taskRows.length) {
      return { ok: false, code: 'COUNT_MISMATCH', message: 'Nisu svi zadaci sačuvani — pokušaj ponovo', detail: { sent: taskRows.length, saved: inserted.length } }
    }
  }

  // 3. Appointments (replace for the day). "Nadgrobni" (dismissed) redovi se NE
  // brišu — oni pamte sklonjene Google događaje da se ne uvuku ponovo.
  const { error: delApptErr } = await supabase.from('appointments').delete()
    .eq('user_id', userId).eq('date_key', dateKey).eq('dismissed', false)
  if (delApptErr) return { ok: false, code: 'DB_DEL_APPT', message: 'Greška pri brisanju termina', detail: delApptErr.message }
  if (appointments && appointments.length > 0) {
    const { error } = await supabase.from('appointments').insert(appointments.map(a => ({
      user_id: userId, date_key: dateKey, name: a.name, time: a.time, end_time: a.end_time ?? null, reminder: a.reminder || DEFAULTS.reminderMinutes, done: a.done ?? false,
      google_event_id: a.google_event_id ?? null,
    })))
    if (error) return { ok: false, code: 'DB_INSERT_APPT', message: 'Greška pri čuvanju termina', detail: error.message }
  }

  // 4. Clear transferred tasks + uskladi stanje zakazanih zadataka.
  //
  // KLJUČNO (migracija 0022): zakazan zadatak se NE zatvara time što je ušao u plan.
  // "done" sada znači "korisnik ga je štiklirao". Zato ovde prepisujemo stanje iz
  // plana: štiklirano → zatvori, neštiklirano → ostavi otvoreno (pa se sutra opet
  // pojavi, jer projekat traje više dana).
  const cleanup: PromiseLike<unknown>[] = [
    supabase.from('transferred_tasks').delete().eq('user_id', userId).eq('for_date', dateKey),
  ]

  const schedIds = (done: boolean) => [...new Set(
    tasks.filter(t => t.scheduledId && (t.done ?? false) === done)
      .map(t => t.scheduledId as string)
  )]

  for (const done of [true, false]) {
    const ids = schedIds(done)
    if (ids.length > 0) {
      // `id in (...)` + user_id su dovoljna zaštita — to su njegovi zadaci.
      cleanup.push(
        supabase.from('scheduled_tasks').update({ done }).eq('user_id', userId).in('id', ids),
      )
    }
  }
  await Promise.all(cleanup)

  // 5. Remember sleep/wake on the profile (best-effort)
  if (sleepTime || wakeTime || sleep != null) {
    await supabase.from('profiles').update({
      ...(sleepTime ? { last_sleep_time: sleepTime } : {}),
      ...(sleep != null ? { last_sleep_hours: sleep } : {}),
      ...(wakeTime ? { start_time: wakeTime } : {}),
    }).eq('id', userId)
  }

  return { ok: true, entryId, tasks: inserted }
}
