'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { todayKey } from '@/lib/date'

type Msg = { role: 'user' | 'assistant'; content: string }
const QUICK = ['Preopterećen/a sam', 'Šta da radim prvo?', 'Nemam energije']

function setLast(m: Msg[], content: string): Msg[] {
  if (!m.length || m[m.length - 1].role !== 'assistant') return m
  const copy = [...m]
  copy[copy.length - 1] = { role: 'assistant', content }
  return copy
}

export default function CoachSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  async function buildContext() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { dateKey: todayKey() }
      const { data: entry } = await supabase.from('day_entries')
        .select('id, energy, energy_level, sleep_hours')
        .eq('user_id', user.id).eq('date_key', todayKey()).maybeSingle()
      if (!entry) return { dateKey: todayKey() }
      const { data: tasks } = await supabase.from('tasks')
        .select('name, type, priority, done').eq('entry_id', entry.id)
      const list = tasks ?? []
      return {
        dateKey: todayKey(),
        energy: entry.energy,
        energy_level: entry.energy_level,
        sleepHours: entry.sleep_hours,
        tasks: list,
        doneCount: list.filter(t => t.done).length,
        total: list.length,
      }
    } catch {
      return { dateKey: todayKey() }
    }
  }

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || streaming) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: msg }, { role: 'assistant', content: '' }])
    setStreaming(true)
    try {
      const context = await buildContext()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context }),
      })
      if (!res.ok || !res.body) {
        setMessages(m => setLast(m, 'Izvini, trenutno ne mogu da odgovorim. Pokušaj ponovo.'))
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        setMessages(m => setLast(m, acc))
      }
    } catch {
      setMessages(m => setLast(m, 'Greška u vezi. Pokušaj ponovo.'))
    } finally {
      setStreaming(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ferox coach">
      <div className="flex items-center justify-between">
        <h3 className="title-serif text-xl" style={{ color: 'var(--text)' }}>💬 Ferox coach</h3>
        <button onClick={onClose} aria-label="Zatvori" className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex flex-col gap-3 min-h-[160px] max-h-[48dvh] overflow-y-auto py-1">
        {messages.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pitaj me bilo šta o današnjem danu — pomoći ću ti da odlučiš šta je realno.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[92%]'}>
            <div
              className="text-sm px-3.5 py-2.5 rounded-[var(--r-md)] whitespace-pre-wrap"
              style={{ background: m.role === 'user' ? 'var(--gold-tint)' : 'var(--surface2)', color: 'var(--text)' }}
            >
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={streaming}
              className="text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Napiši poruku..."
          data-autofocus
          className="field h-12 px-3.5 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="h-12 px-4 rounded-[var(--r-md)] font-semibold text-white disabled:opacity-50 shrink-0"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--gold), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }}
        >
          →
        </button>
      </form>
    </Modal>
  )
}
