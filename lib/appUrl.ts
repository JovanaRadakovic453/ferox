import type { NextRequest } from 'next/server'

/**
 * Kanonski origin aplikacije (npr. "https://ferox-phi.vercel.app").
 * Koristi NEXT_PUBLIC_APP_URL ako je postavljen; u suprotnom ga izvede iz
 * samog zahteva (host + protokol) — pa OAuth redirect radi i bez te promenljive,
 * dok god korisnik koristi domen registrovan u Google Cloud-u.
 */
export function appOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env) return env.replace(/\/+$/, '')
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : ''
}
