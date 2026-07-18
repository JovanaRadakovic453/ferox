import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { appOrigin } from '@/lib/appUrl'
import type { NextRequest } from 'next/server'

// Lažan zahtev — appOrigin čita samo host i x-forwarded-proto.
const req = (host: string, proto = 'https') =>
  ({
    headers: {
      get: (k: string) => (k === 'host' ? host : k === 'x-forwarded-proto' ? proto : null),
    },
  }) as unknown as NextRequest

const DEPLOY = 'ferox-pjt8smfyx-ferox.vercel.app' // adresa jednog objavljivanja
const PROD = 'ferox-phi.vercel.app'

let envBefore: string | undefined
let prodBefore: string | undefined

beforeEach(() => {
  envBefore = process.env.NEXT_PUBLIC_APP_URL
  prodBefore = process.env.VERCEL_PROJECT_PRODUCTION_URL
  delete process.env.NEXT_PUBLIC_APP_URL
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL
})
afterEach(() => {
  if (envBefore === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = envBefore
  if (prodBefore === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = prodBefore
})

describe('appOrigin', () => {
  it('eksplicitni NEXT_PUBLIC_APP_URL pobeđuje (bez kose crte na kraju)', () => {
    process.env.NEXT_PUBLIC_APP_URL = `https://${PROD}/`
    expect(appOrigin(req(DEPLOY))).toBe(`https://${PROD}`)
  })

  it('na Vercel-u koristi STABILAN produkcijski domen, ne adresu objavljivanja', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = PROD
    // Korisnik je na privremenoj adresi objavljivanja — OAuth i dalje ide na kanonsku.
    expect(appOrigin(req(DEPLOY))).toBe(`https://${PROD}`)
  })

  it('zaostali localhost u podešavanjima se ignoriše kad radimo na Vercel-u', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = PROD
    expect(appOrigin(req(DEPLOY))).toBe(`https://${PROD}`)
  })

  it('lokalni rad (bez Vercel-a) izvodi adresu iz zahteva', () => {
    expect(appOrigin(req('localhost:3000', 'http'))).toBe('http://localhost:3000')
  })
})
