'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useT } from '@/components/i18n/I18nProvider'

export default function LogoutButton() {
  const router = useRouter()
  const t = useT()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm px-3 py-1.5 rounded-[10px] transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      {t.common.signOut}
    </button>
  )
}
