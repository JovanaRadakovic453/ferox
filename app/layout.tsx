import type { Metadata, Viewport } from 'next'
import { Spectral, Outfit } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import { APP } from '@/lib/config'

// Serif za naslove i „Ferox" logo: Spectral — miran, prefinjen serif. Odmeren i
// ozbiljan (ne napadan kao Fraunces), a opet ima karakter. Ide uz Outfit sans.
const spectral = Spectral({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: APP.title,
  description: APP.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP.name,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#D4742A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" suppressHydrationWarning className={`${spectral.variable} ${outfit.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
