'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/Toast'
import type { ReactNode } from 'react'

// Jedan provider za celu aplikaciju (tema + toast). Montira se u root layout-u.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  )
}
