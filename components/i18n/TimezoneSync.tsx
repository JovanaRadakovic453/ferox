'use client'

// Tiho usklađuje zonu u profilu sa stvarnom zonom pregledača.
// Postojeći korisnici (Beograd) i oni koji se ne sele → nema promene.
// Ako se razlikuje (npr. korisnik je otputovao), ispravi u bazi jednom.
// NE forsira osvežavanje — ispravka legne pri sledećoj navigaciji, bez trzaja.

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectTimezone } from '@/lib/date'
import { useTimezone } from '@/components/i18n/I18nProvider'

export default function TimezoneSync() {
  const savedTz = useTimezone()

  useEffect(() => {
    const real = detectTimezone()
    if (!real || real === savedTz) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (uid) supabase.from('profiles').update({ timezone: real }).eq('id', uid).then(() => {})
    })
  }, [savedTz])

  return null
}
