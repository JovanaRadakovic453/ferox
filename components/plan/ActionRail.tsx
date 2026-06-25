import Button from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton'
import { tomorrowKey } from '@/lib/date'

// Akcije za plan (sticky rail na desktopu). Navigacija je name-bazirana
// (window.location.href) da server pročita svež finished_at posle završetka dana.
export default function ActionRail({
  dayFinished, isToday, tomorrowPlanned, allDone, savingEod, onFinishDay, onAddTask, onReplan,
}: {
  dayFinished: boolean
  isToday: boolean
  tomorrowPlanned: boolean
  allDone: boolean
  savingEod: boolean
  onFinishDay: () => void
  onAddTask: () => void
  onReplan: () => void
}) {
  return (
    <aside className="flex flex-col gap-3 rail-sticky">
      {!dayFinished && (
        <Button size="lg" className="w-full" onClick={onFinishDay} loading={savingEod}>
          {allDone ? '🎉 Završi dan' : '✅ Završi dan'}
        </Button>
      )}
      {dayFinished && isToday && (
        tomorrowPlanned ? (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
            🌙 Pogledaj plan za sutra →
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/?sutra=1' }}>
            🌙 Isplaniraj sutra →
          </Button>
        )
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={onAddTask}>
          ➕ Dodaj zadatak
        </Button>
        <Button size="sm" variant="secondary" onClick={onReplan}>
          🔥 Dan se raspao
        </Button>
        {isToday ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/?edit=1' }}>
              ✏️ Uredi plan
            </Button>
            {tomorrowPlanned ? (
              <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/plan?date=' + tomorrowKey() }}>
                🌙 Pogledaj sutra
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/?sutra=1' }}>
                🌙 Planiraj sutra
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="secondary" className="col-span-2" onClick={() => { window.location.href = '/plan' }}>
            ← Nazad na današnji plan
          </Button>
        )}
      </div>
      <div className="flex justify-center pt-2">
        <LogoutButton />
      </div>
    </aside>
  )
}
