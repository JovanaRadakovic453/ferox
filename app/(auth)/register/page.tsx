export default function RegisterPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[400px] text-center" style={{ color: 'var(--text)' }}>
        <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
          Ferox
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>Napravite nalog</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Auth — Faza 1 (coming soon)</p>
      </div>
    </main>
  )
}
