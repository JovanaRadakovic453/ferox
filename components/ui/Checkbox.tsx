import { cn } from '@/lib/utils'

/**
 * Premium checkbox — gold gradient fill, SVG check that draws in,
 * and a subtle spring pop when toggled on.
 */
export default function Checkbox({
  checked,
  shape = 'circle',
  className,
}: {
  checked: boolean
  shape?: 'circle' | 'round'
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative grid place-items-center shrink-0 w-[22px] h-[22px] border-2 transition-all duration-200',
        shape === 'circle' ? 'rounded-full' : 'rounded-[7px]',
        className
      )}
      style={{
        borderColor: checked ? 'var(--gold)' : 'var(--border)',
        backgroundImage: checked ? 'linear-gradient(180deg, var(--gold-light), var(--gold))' : 'none',
        boxShadow: checked ? 'var(--sh-gold)' : 'none',
        animation: checked ? 'checkPop 0.3s var(--ease-out)' : undefined,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2 6.2 L4.7 9 L10 3"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 16,
            strokeDashoffset: checked ? 0 : 16,
            opacity: checked ? 1 : 0,
            transition: 'stroke-dashoffset 0.25s var(--ease-out) 0.05s, opacity 0.15s ease',
          }}
        />
      </svg>
    </span>
  )
}
