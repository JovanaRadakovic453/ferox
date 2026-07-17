'use client'

import { useT } from '@/components/i18n/I18nProvider'

export default function PlanLoading() {
  const t = useT()
  return (
    <div className="flex flex-col gap-5 pt-4" aria-busy="true" aria-label={t.common.loadingPlan}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-9 w-32" />
        <div className="skeleton h-12 w-16" />
      </div>
      <div className="skeleton h-2.5 w-full" />
      <div className="skeleton h-36 w-full" />
      <div className="skeleton h-36 w-full" />
      <div className="skeleton h-14 w-full" />
    </div>
  )
}
