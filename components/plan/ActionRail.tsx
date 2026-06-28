import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'
import { tomorrowKey } from '@/lib/date'

// Akcije za plan (sticky rail na desktopu). Navigacija je name-bazirana
// (window.location.href) da server pročita svež finished_at posle završetka dana.
export default function ActionRail({
  dayFinished, isToday, tomorrowPlanned, allDone, savingEod, onFinishDay, onAddTask, onRoutine, onResetDay,
}: {
  dayFinished: boolean
  isToday: boolean
  tomorrowPlanned: boolean
  allDone: boolean
  savingEod: boolean
  onFinishDay: () => void
  onAddTask: () => void
  onRoutine: () => void
  onResetDay: () => void
}) {
  return (
    <aside className="flex flex-col gap-3 rail-sticky">
      {!dayFinished && (
        <Button size="lg" className="w-full" onClick={onFinishDay} loading={savingEod}>
          {allDone ? '🎉 Završi dan' : '✅ Završi dan'}
        </Button>
      )}
      {dayFinished && isToday && tomorrowPlanned && (
        <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
          🌙 Pogledaj plan za sutra →
        </Button>
      )}
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="secondary" className="w-full" onClick={onAddTask}>
          ➕ Dodaj zadatak
        </Button>
{!dayFinished && (
          <Button size="sm" variant="secondary" className="w-full" onClick={onRoutine}>
            📋 Primeni rutinu
          </Button>
        )}
        {isToday && tomorrowPlanned && (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
            🌙 Pogledaj sutra
          </Button>
        )}
        {!isToday && (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => { window.location.href = '/plan' }}>
            ← Nazad na današnji plan
          </Button>
        )}
      </div>
      <div className="flex justify-center pt-2">
        <LogoutButton />
      </div>
      <button
        onClick={onResetDay}
        className="w-full text-xs text-center py-2.5 opacity-45 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        🗑️ Obriši sve za danas i počni iznova
      </button>
    </aside>
  )
}
