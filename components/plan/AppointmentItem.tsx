import Checkbox from '@/components/ui/Checkbox'
import type { Appointment } from '@/types/ferox'

export default function AppointmentItem({ appt, onToggle }: { appt: Appointment; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="checkbox"
      aria-checked={appt.done}
      aria-label={`${appt.time} ${appt.name} (termin)${appt.done ? ', završeno' : ''}`}
      className="flex items-center gap-3 w-full text-left py-2.5 border-b transition-transform active:scale-[0.995]"
      style={{ borderColor: 'var(--hairline)' }}
    >
      <span aria-hidden><Checkbox checked={appt.done} /></span>
      <span
        className="text-sm font-medium shrink-0 transition-all duration-200"
        style={{ color: appt.done ? 'var(--text-muted)' : 'var(--gold)', opacity: appt.done ? 0.6 : 1 }}
      >
        {appt.time}
      </span>
      <p
        className="text-sm flex-1 truncate transition-all duration-200"
        style={{ color: appt.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: appt.done ? 'line-through' : 'none', opacity: appt.done ? 0.6 : 1 }}
      >
        {appt.name}
      </p>
      <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(212,116,42,0.12)', color: 'var(--gold)' }}>termin</span>
    </button>
  )
}
