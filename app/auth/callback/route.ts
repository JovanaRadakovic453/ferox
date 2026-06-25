import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Spreči open-redirect: dozvoli samo interne, relativne putanje (počinju '/',
  // ne '//' ni '/\'). Sve ostalo pada na početnu.
  const rawNext = searchParams.get('next') ?? '/'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let destination = next
      // Supabase may strip ?next= query params from redirectTo in the email link.
      // Detect password recovery via JWT AMR claim so we always land on the right page.
      if (data.session) {
        try {
          // JWT uses base64url (- and _ instead of + and /); Buffer handles it natively.
          const raw = data.session.access_token.split('.')[1]
          const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
          if (payload.amr?.some((m: { method: string }) => m.method === 'recovery')) {
            destination = '/reset-password'
          }
        } catch {}
      }
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
