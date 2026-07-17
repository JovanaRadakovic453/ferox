'use client'

import { useT } from '@/components/i18n/I18nProvider'

export default function Loading() {
  const t = useT()
  return (
    <div className="flex flex-col gap-4 pt-4" aria-busy="true" aria-label={t.common.loading}>
      <div className="skeleton h-9 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
      <div className="skeleton h-24 w-full mt-2" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-32 w-full" />
    </div>
  )
}
