import Input from '@/components/ui/Input'
import { sleepQuality } from '@/lib/energy'
import { SectionHeader } from '@/components/setup/primitives'

export default function SleepCard({
  sleepTime, wakeTime, sleepHours, onSleepChange, onWakeChange,
}: {
  sleepTime: string
  wakeTime: string
  sleepHours: number
  onSleepChange: (v: string) => void
  onWakeChange: (v: string) => void
}) {
  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader icon="😴" title="Kako si spavao/la?" />
      <div className="grid grid-cols-2 gap-3.5">
        <Input id="sleep" label="🌙 Naveče" type="time" value={sleepTime} onChange={e => onSleepChange(e.target.value)} />
        <Input id="wake"  label="☀️ Ujutru" type="time" value={wakeTime}  onChange={e => onWakeChange(e.target.value)} />
      </div>
      {sleepHours > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--r-md)] px-4 py-3.5" style={{ background: 'var(--gold-tint)' }}>
          <span className="text-xl">💤</span>
          <p className="text-sm">
            <span className="font-semibold" style={{ color: 'var(--gold)' }}>{sleepHours}h sna</span>
            <span style={{ color: 'var(--text-muted)' }}> · {sleepQuality(sleepHours)}</span>
          </p>
        </div>
      )}
    </section>
  )
}
