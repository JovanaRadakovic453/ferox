'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AuthCard from '@/components/auth/AuthCard'
import { useT } from '@/components/i18n/I18nProvider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t.auth.passwordTooShort)
      return
    }
    if (password !== confirm) {
      setError(t.auth.passwordMismatch)
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
    <AuthCard subtitle={t.auth.resetTitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="password"
          label={t.auth.newPassword}
          type="password"
          placeholder={t.auth.passwordMin}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoFocus
          autoComplete="new-password"
        />
        <Input
          id="confirm"
          label={t.auth.confirmPassword}
          type="password"
          placeholder={t.auth.passwordRepeatPh}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          error={error}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
          {t.auth.savePassword}
        </Button>
      </form>
    </AuthCard>
  )
}
