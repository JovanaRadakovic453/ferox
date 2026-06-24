'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary'
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{
          borderRadius: 'var(--r-md)',
          ...(isPrimary
            ? {
                backgroundImage: 'linear-gradient(180deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))',
                boxShadow: 'var(--sh-gold)',
              }
            : {}),
          ...style,
        }}
        className={cn(
          'relative inline-flex items-center justify-center font-medium select-none',
          'transition-all duration-200 ease-out active:scale-[0.98] active:translate-y-0',
          'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
          {
            'text-white hover:-translate-y-px hover:brightness-[1.04] active:brightness-95': isPrimary,
            'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface2)] hover:border-[var(--gold)]/40 shadow-[var(--sh-xs)]':
              variant === 'secondary',
            'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]':
              variant === 'ghost',
            'bg-red-500/10 text-red-500 hover:bg-red-500/20': variant === 'danger',
          },
          {
            'text-sm px-4 h-10 gap-1.5': size === 'sm',
            'text-base px-5 h-12 gap-2': size === 'md',
            'text-base px-6 h-14 gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
