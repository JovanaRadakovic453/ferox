import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'
import { tomorrowKey } from '@/lib/date'
import { useT, useTimezone } from '@/components/i18n/I18nProvider'

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
  const t = useT()
  const tz = useTimezone()
  return (
    <aside className="flex flex-col gap-3 rail-sticky">
      {!dayFinished && (
        <Button size="lg" className="w-full" onClick={onFinishDay} loading={savingEod}>
          {allDone ? t.actions.finishDayDone : t.actions.finishDay}
        </Button>
      )}
      {dayFinished && isToday && tomorrowPlanned && (
        <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey(tz) }}>
          {t.actions.seeTomorrow}
        </Button>
      )}
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="secondary" className="w-full" onClick={onAddTask}>
          {t.actions.addTask}
        </Button>
        {!dayFinished && (
          <Button size="sm" variant="secondary" className="w-full" onClick={onRoutine}>
            {t.actions.applyRoutine}
          </Button>
        )}
        {isToday && tomorrowPlanned && (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey(tz) }}>
            {t.actions.peekTomorrow}
          </Button>
        )}
        {!isToday && (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => { window.location.href = '/plan' }}>
            {t.actions.backToToday}
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
        {t.actions.resetDay}
      </button>
    </aside>
  )
}
