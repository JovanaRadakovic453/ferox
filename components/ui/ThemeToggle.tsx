'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'light', label: '☀️ Svetla' },
  { value: 'dark', label: '🌙 Tamna' },
  { value: 'system', label: '⚙️ Sistemska' },
]

export default function ThemeToggle({ onChange }: { onChange?: (v: string) => void }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex gap-2">
      {OPTIONS.map(o => {
        const active = (theme ?? 'system') === o.value
        return (
          <button
            key={o.value}
            onClick={() => { setTheme(o.value); onChange?.(o.value) }}
            className="text-xs px-3 py-2 rounded-[var(--r-md)] transition-colors"
            style={{
              background: active ? 'var(--gold-tint)' : 'var(--surface2)',
              border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              color: active ? 'var(--gold)' : 'var(--text-muted)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
