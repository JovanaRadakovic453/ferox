'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import type { Routine, RoutineTask, Priority } from '@/types/ferox'
import { useT } from '@/components/i18n/I18nProvider'

export default function RoutinesSection({ initialRoutines, userId }: { initialRoutines: Routine[]; userId: string }) {
  const toast = useToast()
  const tr = useT()
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
      toast({ message: tr.routines.needNameTask, variant: 'error' })
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
      if (error) { toast({ message: tr.routines.notSaved, variant: 'error' }); return }
      setRoutines(prev => prev.map(r => r.id === editing.id
        ? { ...r, name: routineName.trim(), tasks: taskData }
        : r
      ))
      cancelForm()
      toast({ message: tr.routines.updated, variant: 'success' })
    } else {
      const { data, error } = await supabase.from('routines').insert({
        user_id: userId,
        name: routineName.trim(),
        tasks: taskData,
      }).select('*').single()
      setSaving(false)
      if (error) { toast({ message: tr.routines.notSaved, variant: 'error' }); return }
      setRoutines(prev => [...prev, data as Routine])
      cancelForm()
      toast({ message: tr.routines.saved, variant: 'success' })
    }
  }

  async function deleteRoutine(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) { toast({ message: tr.routines.deleteFailed, variant: 'error' }); return }
    setRoutines(prev => prev.filter(r => r.id !== id))
    toast({ message: tr.routines.deleted, variant: 'success' })
  }

  return (
    <section className="card p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{tr.routines.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.routines.hint}</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={startCreate}
            className="text-xs px-3 py-1.5 rounded-[var(--r-md)] font-medium transition-colors"
            style={{ background: 'var(--gold-tint)', color: 'var(--gold)', border: '1px solid var(--gold)' }}
          >{tr.routines.newRoutine}</button>
        )}
      </div>

      {routines.length === 0 && !formOpen && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          {tr.routines.empty}
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
                >{tr.routines.edit}</button>
                <button
                  type="button"
                  onClick={() => deleteRoutine(r.id)}
                  className="text-xs opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >{tr.routines.delete}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.tasks.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {t.name}
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {tr.routines.taskCount(r.tasks.length)}
            </p>
          </div>
        ))}
      </div>

      {/* Forma za kreiranje / izmenu */}
      {formOpen && (
        <div className="flex flex-col gap-4 rounded-[var(--r-md)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {editing ? tr.routines.editing(editing.name) : tr.routines.newTitle}
          </p>

          <input
            data-autofocus
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            placeholder={tr.routines.namePlaceholder}
            className="field h-11 px-3.5 text-sm"
          />

          <div className="flex flex-col gap-2">
            {draftTasks.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-[var(--r-md)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex gap-2 items-center">
                  <input
                    value={t.name}
                    onChange={e => updateDraftTask(i, { name: e.target.value })}
                    placeholder={tr.routines.taskPlaceholder(i + 1)}
                    className="field h-9 px-3 text-sm flex-1"
                  />
                  <button type="button" onClick={() => removeDraftTask(i)} className="text-base opacity-40 hover:opacity-80 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
                <select value={t.priority} onChange={e => updateDraftTask(i, { priority: e.target.value as Priority })} className="field field-select h-9 px-2 text-xs">
                  <option value="high">{tr.priority.high}</option>
                  <option value="medium">{tr.priority.medium}</option>
                  <option value="low">{tr.priority.low}</option>
                </select>
              </div>
            ))}
          </div>

          <button type="button" onClick={addDraftTask} className="text-xs font-medium text-left" style={{ color: 'var(--gold)' }}>
            {tr.routines.addTask}
          </button>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={saveRoutine} loading={saving}>
              {editing ? tr.routines.saveChanges : tr.routines.saveRoutine}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>{tr.common.cancel}</Button>
          </div>
        </div>
      )}
    </section>
  )
}
