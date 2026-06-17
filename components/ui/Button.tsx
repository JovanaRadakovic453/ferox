'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-[14px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[var(--gold)] text-white hover:bg-[var(--gold-light)] shadow-sm': variant === 'primary',
            'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]': variant === 'ghost',
            'bg-red-500/10 text-red-500 hover:bg-red-500/20': variant === 'danger',
          },
          {
            'text-sm px-4 h-9': size === 'sm',
            'text-base px-5 h-11': size === 'md',
            'text-base px-6 h-13': size === 'lg',
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
