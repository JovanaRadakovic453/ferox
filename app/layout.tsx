import type { Metadata, Viewport } from 'next'
import { Outfit, Cormorant_Garamond, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import { APP } from '@/lib/config'

// Jedan čist, neutralan sans za celu aplikaciju (naslovi, „Ferox" logo i telo):
// Outfit. Bez serifa — svedeno, moderno, „ozbiljan alat" izgled.
const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

// Cormorant Garamond — samo za „Ferox" logo (elegantan tanak serif, stari izgled).
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-logo',
  display: 'swap',
})

// Source Sans 3 — samo za glavnu navigaciju (Danas, Kalendar…). Humanistički
// sans klasičnih proporcija: mirniji i „ozbiljniji" od geometrijskog Outfit-a.
const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  variable: '--font-nav',
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
    <html lang="sr" suppressHydrationWarning className={`${outfit.variable} ${cormorant.variable} ${sourceSans.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
