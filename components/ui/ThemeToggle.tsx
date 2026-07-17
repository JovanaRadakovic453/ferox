'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useT } from '@/components/i18n/I18nProvider'

export default function ThemeToggle({ onChange, compact }: { onChange?: (v: string) => void; compact?: boolean }) {
  const t = useT()
  const OPTIONS: { value: string; label: string }[] = [
    { value: 'light', label: t.common.themeLight },
    { value: 'dark', label: t.common.themeDark },
  ]
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  if (compact) {
    return (
      <div className="flex gap-1 p-1 rounded-[var(--r-md)]" style={{ background: 'var(--surface2)' }}>
        {OPTIONS.map(o => {
          const active = (theme ?? 'system') === o.value
          return (
            <button
              key={o.value}
              onClick={() => { setTheme(o.value); onChange?.(o.value) }}
              aria-label={o.label}
              aria-pressed={active}
              title={o.label}
              className="flex-1 grid place-items-center h-8 rounded-[10px] text-sm transition-colors"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                boxShadow: active ? 'var(--sh-xs)' : 'none',
                color: active ? 'var(--gold)' : 'var(--text-muted)',
              }}
            >
              {o.label.split(' ')[0]}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map(o => {
        const active = (theme ?? 'system') === o.value
        return (
          <button
            key={o.value}
            onClick={() => { setTheme(o.value); onChange?.(o.value) }}
            aria-pressed={active}
            className="w-full text-center text-xs font-medium px-3 py-2 rounded-[var(--r-md)] transition-colors"
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
