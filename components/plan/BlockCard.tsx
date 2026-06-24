import type { Appointment, PlanBlock } from '@/types/ferox'
import TaskItem from '@/components/plan/TaskItem'
import AppointmentItem from '@/components/plan/AppointmentItem'

export default function BlockCard({
  block, appointments, onToggle, onToggleAppt,
}: {
  block: PlanBlock
  appointments: Appointment[]
  onToggle: (taskId: string) => void
  onToggleAppt: (apptId: string) => void
}) {
  const doneTasks = block.tasks.filter(t => t.done).length
  const doneAppts = appointments.filter(a => a.done).length
  const done = doneTasks + doneAppts
  const total = block.tasks.length + appointments.length

  if (total === 0) return null

  const accent = block.badge.replace('0.15)', '1)')
  const pct = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="card overflow-hidden relative">
      {/* obojena leva accent linija po bloku */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent, opacity: 0.85 }} />
      <div className="flex items-center justify-between pl-5 pr-4 py-3" style={{ background: block.badge }}>
        <div className="flex items-center gap-2 min-w-0">
          <span>{block.badgeText}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{block.label}</span>
          {block.peak && (
            <span className="text-[0.58rem] font-bold tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--gold)', color: '#fff' }}>
              ⚡ VRH DANA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{block.timeRange}</span>
          <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
            {done}/{total}
          </span>
        </div>
      </div>

      {block.rationale && (
        <p className="px-5 pt-2.5 text-xs italic" style={{ color: 'var(--text-muted)' }}>
          {block.rationale}
        </p>
      )}

      <div className="h-1.5 w-full mt-2.5" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, var(--gold-light), var(--gold))' }}
        />
      </div>

      <div className="pl-5 pr-4">
        {appointments.map(a => (
          <AppointmentItem key={a.id ?? a.name + a.time} appt={a} onToggle={() => a.id && onToggleAppt(a.id)} />
        ))}
        <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
          {block.tasks.map(task => (
            <TaskItem key={task.id ?? task.name} task={task} onToggle={() => task.id && onToggle(task.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
