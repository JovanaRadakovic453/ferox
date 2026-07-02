'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { Task } from '@/types/ferox'

export type ReplanResult = { poruka: string; danas: string[]; sutra: string[]; obrisi: string[] }

// "Dan se raspao" — AI replan. Drži sopstveno stanje; primenu (optimističko
// otpisivanje zadataka + DB) radi roditelj preko onApply.
export default function ReplanModal({
  open, onClose, tasks, onApply,
}: {
  open: boolean
  onClose: () => void
  tasks: Task[]
  onApply: (result: ReplanResult) => void
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReplanResult | null>(null)

  useEffect(() => {
    if (open) { setText(''); setLoading(false); setResult(null) }
  }, [open])

  async function run() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const unfinished = tasks.filter(t => !t.done)
      const res = await fetch('/api/ai/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: text, remainingTasks: unfinished.map(t => t.name) }),
      })
      if (res.ok) setResult(await res.json())
      else toast({ message: 'AI replan nije uspeo — pokušaj ponovo', variant: 'error' })
    } catch {
      toast({ message: 'AI replan nije uspeo — pokušaj ponovo', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function apply() {
    if (!result) return
    onApply(result)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} titleId="replan-title">
      <div className="flex items-center justify-between">
        <h3 id="replan-title" className="title-serif text-xl" style={{ color: 'var(--text)' }}>
          🔥 Dan se raspao
        </h3>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      {!result ? (
        <>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Šta se desilo? AI će replanirati tvoj dan.
          </p>
          <textarea
            data-autofocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Npr: Hitna stvar na poslu, morao/la sam da ostavim sve i rešim problem..."
            rows={3}
            className="field p-3.5 text-sm resize-none"
          />
          <Button size="md" className="w-full" onClick={run} loading={loading} disabled={!text.trim()}>
            {loading ? 'Replaniram...' : 'Replanira mi dan →'}
          </Button>
        </>
      ) : (
        <>
          <div className="p-4 rounded-[var(--r-md)]" style={{ background: 'var(--gold-tint)' }}>
            <p className="text-sm italic" style={{ color: 'var(--gold)' }}>&quot;{result.poruka}&quot;</p>
          </div>
          {result.danas.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>✅ Danas završi:</p>
              {result.danas.map(t => <p key={t} className="text-sm py-0.5">• {t}</p>)}
            </div>
          )}
          {result.sutra.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>📅 Sutra:</p>
              {result.sutra.map(t => <p key={t} className="text-sm py-0.5 opacity-60">• {t}</p>)}
            </div>
          )}
          {result.obrisi.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>🗑️ Otpiši:</p>
              {result.obrisi.map(t => <p key={t} className="text-sm py-0.5 line-through opacity-40">• {t}</p>)}
            </div>
          )}
          <Button size="md" className="w-full" onClick={apply}>
            Primeni plan ✓
          </Button>
        </>
      )}
    </Modal>
  )
}
