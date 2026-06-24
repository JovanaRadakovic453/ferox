'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera')
      return
    }
    if (password !== confirm) {
      setError('Lozinke se ne poklapaju')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <AuthCard subtitle="Postavi novu lozinku">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="password"
          label="Nova lozinka"
          type="password"
          placeholder="Min. 6 karaktera"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoFocus
          autoComplete="new-password"
        />
        <Input
          id="confirm"
          label="Potvrdi lozinku"
          type="password"
          placeholder="Isti kao gore"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          error={error}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
          Sačuvaj lozinku
        </Button>
      </form>
    </AuthCard>
  )
}
