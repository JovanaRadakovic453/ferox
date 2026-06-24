import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /auth/* je callback koji razmenjuje `code` iz mejla za sesiju (email
  // potvrda + reset lozinke). Tu korisnik JOŠ nema sesiju — ako ga guard
  // ovde redirektuje na /login, exchangeCodeForSession se nikad ne izvrši i
  // reset link "vraća na login". Mora ostati javan.
  const isCallback = pathname.startsWith('/auth')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  // /reset-password se otvara sa recovery sesijom; ne smemo ga gurati na login
  // (nema sesije pre callbacka) ni na / (ima je posle) — tretiramo ga kao javan.
  const isPublic = isAuthPage || isCallback || pathname.startsWith('/reset-password')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
