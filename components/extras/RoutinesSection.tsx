'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import type { Routine, RoutineTask, Priority } from '@/types/ferox'

export default function RoutinesSection({ initialRoutines, userId }: { initialRoutines: Routine[]; userId: string }) {
  const toast = useToast()
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [routineName, setRoutineName] = useState('')
  const [draftTasks, setDraftTasks] = useState<RoutineTask[]>([])
  const [saving, setSaving] = useState(false)

  function addDraftTask() {
    setDraftTasks(prev => [...prev, { name: '', type: 'light', priority: 'medium' }])
  }

  function updateDraftTask(i: number, patch: Partial<RoutineTask>) {
    setDraftTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }

  function removeDraftTask(i: number) {
    setDraftTasks(prev => prev.filter((_, idx) => idx !== i))
  }

  function startCreate() {
    setEditing(null)
    setRoutineName('')
    setDraftTasks([{ name: '', type: 'light', priority: 'medium' }])
    setFormOpen(true)
  }

  function startEdit(r: Routine) {
    setEditing(r)
    setRoutineName(r.name)
    setDraftTasks(r.tasks.map(t => ({ ...t })))
    setFormOpen(true)
  }

  function cancelForm() {
    setFormOpen(false)
    setEditing(null)
    setRoutineName('')
    setDraftTasks([])
  }

  async function saveRoutine() {
    const validTasks = draftTasks.filter(t => t.name.trim())
    if (!routineName.trim() || validTasks.length === 0) {
      toast({ message: 'Upiši naziv i dodaj bar jedan zadatak', variant: 'error' })
      return
    }
    setSaving(true)
    const supabase = createClient()
    const taskData = validTasks.map(t => ({ ...t, block_index: t.block_index ?? null }))

    if (editing) {
      const { error } = await supabase.from('routines')
        .update({ name: routineName.trim(), tasks: taskData })
        .eq('id', editing.id)
      setSaving(false)
      if (error) { toast({ message: 'Nije sačuvano — pokušaj ponovo', variant: 'error' }); return }
      setRoutines(prev => prev.map(r => r.id === editing.id
        ? { ...r, name: routineName.trim(), tasks: taskData }
        : r
      ))
      cancelForm()
      toast({ message: 'Rutina ažurirana ✓', variant: 'success' })
    } else {
      const { data, error } = await supabase.from('routines').insert({
        user_id: userId,
        name: routineName.trim(),
        tasks: taskData,
      }).select('*').single()
      setSaving(false)
      if (error) { toast({ message: 'Nije sačuvano — pokušaj ponovo', variant: 'error' }); return }
      setRoutines(prev => [...prev, data as Routine])
      cancelForm()
      toast({ message: 'Rutina sačuvana ✓', variant: 'success' })
    }
  }

  async function deleteRoutine(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) { toast({ message: 'Brisanje nije uspelo', variant: 'error' }); return }
    setRoutines(prev => prev.filter(r => r.id !== id))
    toast({ message: 'Rutina obrisana', variant: 'success' })
  }

  return (
    <section className="card p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">📋 Rutine</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sačuvaj set zadataka i primeni jednim klikom</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={startCreate}
            className="text-xs px-3 py-1.5 rounded-[var(--r-md)] font-medium transition-colors"
            style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
          >+ Nova rutina</button>
        )}
      </div>

      {routines.length === 0 && !formOpen && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          Još nema rutina. Klikni "+ Nova rutina" da napraviš prvu.
        </p>
      )}

      {/* Lista sačuvanih rutina */}
      <div className="flex flex-col gap-3">
        {routines.map(r => (
          <div key={r.id} className="rounded-[var(--r-md)] p-4 flex flex-col gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{r.name}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--gold)' }}
                >Izmeni</button>
                <button
                  type="button"
                  onClick={() => deleteRoutine(r.id)}
                  className="text-xs opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >Obriši</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.tasks.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {t.name}
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {r.tasks.length} {r.tasks.length === 1 ? 'zadatak' : r.tasks.length < 5 ? 'zadatka' : 'zadataka'}
            </p>
          </div>
        ))}
      </div>

      {/* Forma za kreiranje / izmenu */}
      {formOpen && (
        <div className="flex flex-col gap-4 rounded-[var(--r-md)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {editing ? `Izmena: ${editing.name}` : 'Nova rutina'}
          </p>

          <input
            data-autofocus
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            placeholder="Naziv rutine (npr. Jutarnja rutina)"
            className="field h-11 px-3.5 text-sm"
          />

          <div className="flex flex-col gap-2">
            {draftTasks.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-[var(--r-md)]" style={{ background: 'var(--surface1)', border: '1px solid var(--border)' }}>
                <div className="flex gap-2 items-center">
                  <input
                    value={t.name}
                    onChange={e => updateDraftTask(i, { name: e.target.value })}
                    placeholder={`Zadatak ${i + 1}`}
                    className="field h-9 px-3 text-sm flex-1"
                  />
                  <button type="button" onClick={() => removeDraftTask(i)} className="text-base opacity-40 hover:opacity-80 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
                <select value={t.priority} onChange={e => updateDraftTask(i, { priority: e.target.value as Priority })} className="field field-select h-9 px-2 text-xs">
                  <option value="high">🔴 Visok</option>
                  <option value="medium">🟡 Srednji</option>
                  <option value="low">🟢 Nizak</option>
                </select>
              </div>
            ))}
          </div>

          <button type="button" onClick={addDraftTask} className="text-xs font-medium text-left" style={{ color: 'var(--gold)' }}>
            + Dodaj zadatak
          </button>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={saveRoutine} loading={saving}>
              {editing ? 'Sačuvaj izmene' : 'Sačuvaj rutinu'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>Otkaži</Button>
          </div>
        </div>
      )}
    </section>
  )
}
