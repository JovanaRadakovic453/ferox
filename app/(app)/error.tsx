'use client'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
      <span className="text-5xl">😕</span>
      <h1 className="title-serif text-2xl" style={{ color: 'var(--text)' }}>Nešto je pošlo naopako</h1>
      <p className="text-sm max-w-[30ch]" style={{ color: 'var(--text-muted)' }}>
        Desila se greška. Pokušaj ponovo — tvoji podaci su bezbedni.
      </p>
      <button
        onClick={reset}
        className="text-sm font-semibold px-5 py-2.5 rounded-[var(--r-md)] text-white"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--gold), var(--gold-deep))', boxShadow: 'var(--sh-gold)' }}
      >
        Pokušaj ponovo
      </button>
    </main>
  )
}
