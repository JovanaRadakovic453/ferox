'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'

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
    setError('')
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-callback`,
    })
    if (resetError) {
      setError(resetError.message)
      setResetLoading(false)
      return
    }
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
    <AuthCard
      subtitle="Tvoj lični planer dana"
      footer={
        <>
          Nemaš nalog?{' '}
          <Link
            href="/register"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--gold)' }}
          >
            Registruj se
          </Link>
        </>
      }
    >
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
          <p className="text-sm text-center rounded-[10px] px-3 py-2" style={{ background: 'var(--ok-tint)', color: 'var(--ok)' }}>
            ✓ Poslali smo ti link za reset lozinke na email
          </p>
        )}
      </form>
    </AuthCard>
  )
}
