import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ferox — Planer prema energiji',
  description: 'Energy-adaptive daily planner. Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi. Ferox pomera tvoj raspored prema energiji koju ćeš stvarno imati.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ferox',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D4742A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  )
}
