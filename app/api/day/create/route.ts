import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Task, Appointment } from '@/types/ferox'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dateKey, energy, sleepHours, sleepTime, wakeTime, tasks, appointments } = body as {
    dateKey: string
    energy: string
    sleepHours: number
    sleepTime: string
    wakeTime: string
    tasks: Task[]
    appointments: Appointment[]
  }

  if (!dateKey || !energy || !tasks?.length) {
    return NextResponse.json({ error: 'Nedostaju podaci' }, { status: 400 })
  }

  // Korak 1: Nadji postojeci entry
  const { data: existing, error: findErr } = await supabase
    .from('day_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('date_key', dateKey)
    .maybeSingle()

  if (findErr) {
    return NextResponse.json({ error: 'Greška pri pretrazi', detail: findErr.message }, { status: 500 })
  }

  let entryId: string

  if (existing) {
    entryId = existing.id

    // Korak 2a: Obrisi stare zadatke
    const { error: delTasksErr } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('entry_id', entryId)

    if (delTasksErr) {
      return NextResponse.json({ error: 'Greška pri brisanju zadataka', detail: delTasksErr.message }, { status: 500 })
    }

    // Korak 2b: Azuriraj postojeci entry
    const { error: updateErr } = await supabase
      .from('day_entries')
      .update({ energy, sleep_hours: sleepHours, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', entryId)

    if (updateErr) {
      return NextResponse.json({ error: 'Greška pri ažuriranju', detail: updateErr.message }, { status: 500 })
    }
  } else {
    // Korak 2: Kreiraj novi entry
    const { data: newEntry, error: insertEntryErr } = await supabase
      .from('day_entries')
      .insert({
        user_id: user.id,
        date_key: dateKey,
        energy,
        sleep_hours: sleepHours,
        water_intake: 0,
        water_goal: 2000,
      })
      .select('id')
      .single()

    if (insertEntryErr || !newEntry) {
      return NextResponse.json({ error: 'Greška pri kreiranju dana', detail: insertEntryErr?.message }, { status: 500 })
    }

    entryId = newEntry.id
  }

  // Korak 3: Ubaci nove zadatke
  const taskRows = tasks.map((t: Task, i: number) => ({
    entry_id: entryId,
    user_id: user.id,
    name: t.name,
    done: false,
    priority: t.priority,
    type: t.type,
    note: t.note ?? '',
    position: i,
  }))

  const { data: insertedTasks, error: insertTasksErr } = await supabase
    .from('tasks')
    .insert(taskRows)
    .select('id, name')

  if (insertTasksErr) {
    return NextResponse.json({ error: 'Greška pri ubacivanju zadataka', detail: insertTasksErr.message }, { status: 500 })
  }

  // Verifikacija: proveri koliko je zadataka stvarno u bazi
  const { data: dbTasks } = await supabase
    .from('tasks')
    .select('id, name')
    .eq('entry_id', entryId)
    .eq('user_id', user.id)

  const sentCount = tasks.length
  const dbCount = dbTasks?.length ?? 0

  if (dbCount !== sentCount) {
    return NextResponse.json({
      error: `Baza ima ${dbCount} zadataka, ali poslato ${sentCount}. Kontaktiraj podršku.`,
      detail: 'count_mismatch',
      sentCount,
      dbCount,
      dbTaskNames: dbTasks?.map(t => t.name),
    }, { status: 500 })
  }

  // Korak 4: Termini
  await supabase.from('appointments').delete()
    .eq('user_id', user.id).eq('date_key', dateKey)

  if (appointments?.length > 0) {
    await supabase.from('appointments').insert(
      appointments.map((a: Appointment) => ({
        user_id: user.id,
        date_key: dateKey,
        name: a.name,
        time: a.time,
        reminder: a.reminder,
        done: false,
      }))
    )
  }

  // Korak 5: Obrisi prenete zadatke
  await supabase.from('transferred_tasks')
    .delete()
    .eq('user_id', user.id)
    .eq('for_date', dateKey)

  // Korak 6: Azuriraj profil
  await supabase.from('profiles')
    .update({ last_sleep_time: sleepTime, last_sleep_hours: sleepHours, start_time: wakeTime })
    .eq('id', user.id)

  return NextResponse.json({
    ok: true,
    entryId,
    tasksSent: sentCount,
    tasksSaved: dbCount,
    taskNames: dbTasks?.map(t => t.name),
  })
}
