'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Task, TaskType, Priority } from '@/types/ferox'
import { SectionHeader, CountChip, EMPTY_TASK } from '@/components/setup/primitives'
import { useT, useLocale, useTimezone } from '@/components/i18n/I18nProvider'
import { getDeadlineBadge } from '@/lib/deadline'
import { todayKey } from '@/lib/date'

type TaskDraft = { name: string; note: string; priority: Priority; type: TaskType }
type TaskPatch = { priority?: Priority }

export default function TaskEditor({
  tasks, onAdd, onRemove, onUpdate,
}: {
  tasks: Task[]
  onAdd: (t: TaskDraft) => void
  onRemove: (index: number) => void
  onUpdate?: (index: number, patch: TaskPatch) => void
}) {
  const tr = useT()
  const locale = useLocale()
  const tz = useTimezone()
  const today = todayKey(tz)
  const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'high', label: tr.priority.high },
    { value: 'medium', label: tr.priority.medium },
    { value: 'low', label: tr.priority.low },
  ]
  const [form, setForm] = useState<TaskDraft>({ ...EMPTY_TASK })
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  function add() {
    if (!form.name.trim()) return
    onAdd(form)
    setForm({ ...EMPTY_TASK })
    setShowForm(false)
  }

  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader icon="list" title={tr.setup.tasksToday} trailing={<CountChip n={tasks.length} />} />

      {tasks.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t, i) => (
            <div key={i} className="flex flex-col gap-3 p-3.5 rounded-[var(--r-sm)]" style={{ background: 'var(--surface2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
                  background: t.priority === 'high' ? 'var(--danger-tint)' : t.priority === 'medium' ? 'var(--warn-tint)' : 'var(--ok-tint)',
                  color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warn)' : 'var(--ok)',
                }}>
                  {tr.priorityShort[t.priority]}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Ista težina kao naziv termina — zadaci i termini su ravnopravni
                      u planu, pa jedan ne sme da bude podebljan u odnosu na drugi. */}
                  <p className="text-sm truncate">{t.name}</p>
                  {/* Rok se vidi već DOK se pravi plan, ne tek u planu — zadatak iz
                      Kalendara često dolazi sa rokom, pa korisnik odmah zna dokle ima. */}
                  {(() => {
                    const dl = t.deadline_date ? getDeadlineBadge(t.deadline_date, today, locale) : null
                    return dl ? (
                      <span
                        className="inline-flex items-center gap-1 text-[0.62rem] font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{ color: dl.color, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
                      >
                        <span aria-hidden>▲</span> {dl.text}
                      </span>
                    ) : null
                  })()}
                </div>
                {onUpdate && (
                  <button onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                    style={{ color: editingIndex === i ? 'var(--gold)' : 'var(--text-muted)' }}
                    aria-label={tr.setup.editPriority}>✎</button>
                )}
                <button onClick={() => onRemove(i)}
                  className="text-xs shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={tr.common.delete}>✕</button>
              </div>

              {onUpdate && editingIndex === i && (
                <div className="pt-1">
                  <label className="text-[0.7rem] mb-1 block font-medium" style={{ color: 'var(--text-muted)' }}>{tr.setup.priorityLabel}</label>
                  <select value={t.priority}
                    onChange={e => onUpdate(i, { priority: e.target.value as Priority })}
                    className="field field-select h-10 px-2 text-sm w-full">
                    {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-3 p-4 rounded-[var(--r-sm)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <Input id="task-name" placeholder={tr.setup.taskNamePh} value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && form.name.trim()) add() }}
            autoFocus />
          <Input id="task-note" placeholder={tr.setup.notePh} value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{tr.setup.priorityLabel}</label>
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              className="field field-select h-11 px-3 text-sm">
              {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={!form.name.trim()} className="flex-1">{tr.setup.addTaskBtn}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY_TASK }) }}>{tr.common.cancel}</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 p-4 rounded-[var(--r-sm)] border-[1.5px] border-dashed border-[var(--border)] text-sm w-full text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]">
          <span className="text-lg">+</span> {tr.setup.addTask}
        </button>
      )}
    </section>
  )
}
