import type { NextRequest } from 'next/server'

const isLocalUrl = (u: string) => /localhost|127\.0\.0\.1/.test(u)

/**
 * Kanonski origin aplikacije (npr. "https://ferox-phi.vercel.app").
 *
 * ⚠️ NIKAD ne sme da vrati adresu POJEDINAČNOG Vercel objavljivanja
 * ("ferox-<hash>-<scope>.vercel.app") — ona se menja pri svakoj objavi, pa se
 * ne može upisati u Google Cloud i OAuth sa nje pada na `redirect_uri_mismatch`.
 * Zato: eksplicitni NEXT_PUBLIC_APP_URL → stabilan Vercel produkcijski domen →
 * (tek za lokalni rad) host iz zahteva.
 */
export function appOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  // Stabilan produkcijski domen projekta (Vercel ga sam postavlja).
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()

  // Zaštita od zaostalog podešavanja: localhost u env-u dok radimo na Vercel-u
  // se ignoriše (inače bi OAuth vodio na tuđi/lokalni računar).
  if (env && !(prod && isLocalUrl(env))) return env
  if (prod) return `https://${prod}`

  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : ''
}
