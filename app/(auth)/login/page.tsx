'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleReset() {
    if (!email.trim()) { setError('Upiši email pa klikni "Zaboravio/la lozinku?"'); return }
    setResetLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setResetSent(true)
    setResetLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Pogrešan email ili lozinka'
          : error.message
      )
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center p-5"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-[400px] rounded-[20px] p-7 shadow-lg"
        style={{ background: 'var(--surface)', boxShadow: 'var(--sh2)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-light tracking-wider mb-1"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}
          >
            Ferox
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Planira dan prema tvojoj energiji
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="tvoj@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            label="Lozinka"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={error}
          />

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            Prijavi se
          </Button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetLoading}
            className="w-full text-sm text-center py-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--gold)' }}
          >
            {resetLoading ? 'Šaljem...' : 'Zaboravio/la lozinku?'}
          </button>

          {resetSent && (
            <p className="text-sm text-center rounded-[10px] px-3 py-2" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
              ✓ Poslali smo ti link za reset lozinke na email
            </p>
          )}
        </form>

        {/* Switch to register */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: 'var(--text-muted)' }}
        >
          Nemaš nalog?{' '}
          <Link
            href="/register"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--gold)' }}
          >
            Registruj se
          </Link>
        </p>
      </div>
    </main>
  )
}
