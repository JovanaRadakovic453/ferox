'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Task, TaskType, Priority } from '@/types/ferox'
import { SectionHeader, CountChip, PRIORITY_OPTIONS, EMPTY_TASK } from '@/components/setup/primitives'

type Zone = { id: string; name: string; icon: string }
type TaskDraft = { name: string; note: string; priority: Priority; type: TaskType; zone_id: string | null }
type TaskPatch = { priority?: Priority; zone_id?: string | null }

export default function TaskEditor({
  tasks, onAdd, onRemove, onUpdate, zones = [],
}: {
  tasks: Task[]
  onAdd: (t: TaskDraft) => void
  onRemove: (index: number) => void
  onUpdate?: (index: number, patch: TaskPatch) => void
  zones?: Zone[]
}) {
  const [form, setForm] = useState<TaskDraft>({ ...EMPTY_TASK, zone_id: null })
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const zoneById = new Map(zones.map(z => [z.id, z]))

  function add() {
    if (!form.name.trim()) return
    onAdd(form)
    setForm({ ...EMPTY_TASK, zone_id: null })
    setShowForm(false)
  }

  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader icon="📋" title="Zadaci za danas" trailing={<CountChip n={tasks.length} />} />

      {tasks.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t, i) => (
            <div key={i} className="flex flex-col gap-3 p-3.5 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
                  background: t.priority === 'high' ? 'var(--danger-tint)' : t.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
                  color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
                }}>
                  {t.priority === 'high' ? 'V' : t.priority === 'medium' ? 'S' : 'N'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  {t.zone_id && zoneById.has(t.zone_id) && (
                    <p className="text-[0.7rem] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {zoneById.get(t.zone_id)!.icon} {zoneById.get(t.zone_id)!.name}
                    </p>
                  )}
                </div>
                {onUpdate && (
                  <button onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                    style={{ color: editingIndex === i ? 'var(--gold)' : 'var(--text-muted)' }}
                    aria-label="Izmeni prioritet i oblast">✎</button>
                )}
                <button onClick={() => onRemove(i)}
                  className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Obriši">✕</button>
              </div>

              {onUpdate && editingIndex === i && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[0.7rem] mb-1 block font-medium" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
                    <select value={t.priority}
                      onChange={e => onUpdate(i, { priority: e.target.value as Priority })}
                      className="field field-select h-10 px-2 text-sm w-full">
                      {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {zones.length > 0 && (
                    <div>
                      <label className="text-[0.7rem] mb-1 block font-medium" style={{ color: 'var(--text-muted)' }}>Oblast</label>
                      <select value={t.zone_id ?? ''}
                        onChange={e => onUpdate(i, { zone_id: e.target.value || null })}
                        className="field field-select h-10 px-2 text-sm w-full">
                        <option value="">— Bez oblasti</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.icon} {z.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <Input id="task-name" placeholder="Naziv zadatka" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && form.name.trim()) add() }}
            autoFocus />
          <Input id="task-note" placeholder="Napomena (opciono)" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Prioritet</label>
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              className="field field-select h-11 px-3 text-sm">
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {zones.length > 0 && (
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Oblast</label>
              <select value={form.zone_id ?? ''}
                onChange={e => setForm(f => ({ ...f, zone_id: e.target.value || null }))}
                className="field field-select h-11 px-3 text-sm">
                <option value="">— Bez oblasti</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.icon} {z.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={!form.name.trim()} className="flex-1">Dodaj</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY_TASK, zone_id: null }) }}>Otkaži</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 p-4 rounded-[var(--r-md)] border-[1.5px] border-dashed border-[var(--border)] text-sm w-full text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
          <span className="text-lg">+</span> Dodaj zadatak
        </button>
      )}
    </section>
  )
}
