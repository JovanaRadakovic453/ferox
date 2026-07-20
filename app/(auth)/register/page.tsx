'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'
import { useT } from '@/components/i18n/I18nProvider'

export default function RegisterPage() {
  const router = useRouter()
  const t = useT()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t.auth.passwordTooShort)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(
        signUpError.message === 'User already registered'
          ? t.auth.emailTaken
          : signUpError.message
      )
      setLoading(false)
      return
    }

    // Update profile with name
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ name })
        .eq('id', data.user.id)
    }

    // If email confirmation is disabled, user is immediately logged in
    if (data.session) {
      router.push('/onboarding')
      router.refresh()
    } else {
      // Email confirmation required
      router.push('/login?message=Proveri+email+za+potvrdu')
    }
  }

  return (
    <AuthCard
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{' '}
          <Link
            href="/login"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--gold)' }}
          >
            {t.auth.login}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="name"
          label={t.auth.yourName}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoComplete="given-name"
        />
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
          placeholder={t.auth.passwordMin}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          error={error}
        />

        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="w-full mt-2"
        >
          {t.auth.createAccount}
        </Button>
      </form>
    </AuthCard>
  )
}
