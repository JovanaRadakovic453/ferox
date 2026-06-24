'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera')
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
          ? 'Ovaj email je već registrovan'
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
      subtitle="Napravi nalog i počni da planiraš pametnije"
      footer={
        <>
          Već imaš nalog?{' '}
          <Link
            href="/login"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--gold)' }}
          >
            Prijavi se
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="name"
          label="Tvoje ime"
          type="text"
          placeholder="Jovana"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoComplete="given-name"
        />
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
          placeholder="Min. 6 karaktera"
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
          Napravi nalog
        </Button>
      </form>
    </AuthCard>
  )
}
