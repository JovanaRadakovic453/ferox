'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'
import { useT } from '@/components/i18n/I18nProvider'

export default function LoginPage() {
  const router = useRouter()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleReset() {
    if (!email.trim()) { setError(t.auth.resetNeedEmail); return }
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
          ? t.auth.wrongCreds
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
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{' '}
          <Link
            href="/register"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--gold)' }}
          >
            {t.auth.signUp}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          label={t.auth.email}
          type="email"
          placeholder={t.auth.emailPh}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          label={t.auth.password}
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
          {t.auth.login}
        </Button>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetLoading}
          className="w-full text-sm text-center py-1 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--gold)' }}
        >
          {resetLoading ? t.auth.sending : t.auth.forgot}
        </button>

        {resetSent && (
          <p className="text-sm text-center rounded-[10px] px-3 py-2" style={{ background: 'var(--ok-tint)', color: 'var(--ok)' }}>
            {t.auth.resetSent}
          </p>
        )}
      </form>
    </AuthCard>
  )
}
