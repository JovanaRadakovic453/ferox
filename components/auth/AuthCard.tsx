import { ReactNode } from 'react'

export default function AuthCard({
  subtitle,
  children,
  footer,
}: {
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] animate-fade-slide">
        <div
          className="relative overflow-hidden p-8"
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--sh-lg)',
            border: '1px solid var(--hairline)',
          }}
        >
          {/* gold top accent */}
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }}
          />
          <div className="text-center mb-8">
            <h1 className="display text-6xl tracking-[0.04em] mb-2" style={{ color: 'var(--gold)' }}>
              Ferox
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          </div>
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            {footer}
          </p>
        )}
      </div>
    </main>
  )
}
